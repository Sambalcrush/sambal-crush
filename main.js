
import { loadSprites, drawBoard, spawnPopup, showCombo, spawnParticles, attachBoardContext } from './ui/effects.js';
import { createBoard, swapTiles, findMatches, removeAndCollapse, makeTile } from './engine/board.js';
import { resolveSpecialCreation } from './engine/powerups.js';
import { goalForLevel, movesForLevel, isBossLevel } from './systems/levels.js';
import { loadState, saveState, refreshLives, spendLife, buyItem, nextLifeRemaining } from './systems/lives.js';
import { addCoins, addGems } from './systems/economy.js';
import { claimDaily, canClaimDaily } from './systems/rewards.js';
import { maybeStartChest, chestStatus, openChest, speedUpChestByAd } from './systems/chests.js';
import { chargeSam, maybeLevelSam, samPowerCoverage } from './systems/sam.js';
import { applyDevMode } from './systems/adminTools.js';
import { buildLevelMap } from './ui/levelmap.js';
import { rewardAd } from './systems/ads.js';
import { collectFactory } from './systems/factory.js';
import { canOpenBonusLevel, playBonusMiniGame } from './systems/bonus.js';
import { saveHighScore } from './systems/leaderboard.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
attachBoardContext({ canvas, popupLayer: $('scorePopups'), comboOverlay: $('comboOverlay') });

let sprites = {};
let game = {
  grid: [],
  selected: null,
  score: 0,
  level: 1,
  moves: 20,
  goal: 1200,
  state: applyDevMode(loadState(), new URLSearchParams(location.search).get('dev') === 'true'),
  inputLocked: false,
  hammerMode: false
};

function setMessage(msg){ $('message').textContent = msg; }
function persist(){ game.state.level = game.level; saveState(game.state); }

function syncLevelState() {
  game.goal = goalForLevel(game.level);
  game.moves = movesForLevel(game.level);
}

function updatePanels() {
  $('dailyRewardText').textContent = canClaimDaily(game.state) ? 'Nog niet geclaimd vandaag.' : 'Daily reward al geclaimd.';
  $('claimDaily').disabled = !canClaimDaily(game.state);
  const chest = chestStatus(game.state);
  $('chestText').textContent = chest.text;
  $('openChest').disabled = !chest.available;
  $('bonusText').textContent = canOpenBonusLevel(game.level - 1) ? 'Bonus minigame beschikbaar!' : 'Bonus level nog niet actief.';
}

function updateUI() {
  game.state = refreshLives(loadState());
  game.state.level = game.level;
  saveState(game.state);

  $('score').textContent = game.score;
  $('level').textContent = game.level;
  $('moves').textContent = game.moves;
  $('goal').textContent = game.goal;
  $('coins').textContent = game.state.coins;
  $('gems').textContent = game.state.gems || 0;
  $('lives').textContent = game.state.lives;
  $('samLevel').textContent = game.state.samLevel;
  $('hammerStatus').textContent = `Hammers: ${game.state.hammers}${game.hammerMode ? ' (tik op een tegel)' : ''}`;
  $('lifeTimerText').textContent = game.state.lives >= 5 ? 'Volle levens beschikbaar.' : `Volgend leven over ${nextLifeRemaining(game.state)}.`;
  $('factoryText').textContent = 'Produceert langzaam muntjes terwijl je offline bent.';
  $('adHintText').textContent = 'Rewarded ads zijn demo-knoppen tot echte advertentie-koppeling.';

  updatePanels();
  buildLevelMap($('levelMap'), game.level, game.state.maxUnlocked, loadLevel);
}

function loadLevel(level) {
  game.level = level;
  syncLevelState();
  game.score = 0;
  game.selected = null;
  game.grid = createBoard();
  updateUI();
  setMessage(`Level ${level} geladen`);
}

function maybeAnimalBonus() {
  const roll = Math.random();
  if (roll > 0.22) return;
  const bonuses = [
    { face:'🐹', title:'Sambal Hamster!', text:'Hier heb je een extra leven.', apply:s => s.lives = Math.min(5, s.lives + 1) },
    { face:'🐱', title:'Lucky Cat!', text:'+40 muntjes voor testen.', apply:s => s.coins += 40 },
    { face:'🐸', title:'Power Frog!', text:'Je krijgt 1 hammer boost.', apply:s => s.hammers += 1 },
  ];
  const pick = bonuses[Math.floor(Math.random()*bonuses.length)];
  pick.apply(game.state);
  saveState(game.state);
  $('animalFace').textContent = pick.face;
  $('animalTitle').textContent = pick.title;
  $('animalText').textContent = pick.text;
  $('animalEvent').classList.remove('hidden');
  setTimeout(() => $('animalEvent').classList.add('hidden'), 2800);
}

function tone(freq, dur, type='sine', gain=0.03, when=0) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!tone.ctx) tone.ctx = new (window.AudioContext || window.webkitAudioContext)();
  const ac = tone.ctx, o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime + when;
  o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(ac.destination);
  o.start(now); o.stop(now + dur); g.gain.setValueAtTime(gain, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
}
const sounds = {
  match(){ tone(620,.08,'triangle',.03); tone(780,.08,'triangle',.024,.06); },
  combo(){ tone(520,.08,'square',.03); tone(720,.08,'square',.03,.05); tone(960,.1,'square',.02,.11); },
  win(){ tone(520,.08,'triangle',.03); tone(660,.08,'triangle',.03,.08); tone(820,.12,'triangle',.03,.16); },
  bomb(){ tone(160,.08,'sawtooth',.04); tone(90,.16,'sawtooth',.03,.04); }
};

function refillGrid(grid) {
  for (let x = 0; x < 8; x++) {
    const stack = [];
    for (let y = 7; y >= 0; y--) if (grid[y][x]) stack.push(grid[y][x]);
    for (let y = 7; y >= 0; y--) grid[y][x] = stack.length ? stack.shift() : makeTile();
  }
  return grid;
}

function triggerSamPower() {
  const coverage = samPowerCoverage(game.state);
  let burned = 0;
  for (let y=0;y<8;y++) for (let x=0;x<8;x++) if (Math.random() < coverage) { game.grid[y][x] = null; burned++; }
  refillGrid(game.grid);
  for (let i=0;i<12;i++) spawnParticles(Math.random()*canvas.clientWidth, Math.random()*canvas.clientHeight, ['#fb923c','#ef4444','#facc15','#ffffff']);
  sounds.bomb(); sounds.combo();
  setMessage(`Sam gebruikt vuurscheet! ${burned} tiles verbrand.`);
}

async function resolveBoardLoop() {
  game.inputLocked = true;
  while (true) {
    const matches = findMatches(game.grid);
    if (!matches.length) break;

    game.state = chargeSam(game.state, 10 + (matches.length >= 5 ? 10 : 0));
    const creation = resolveSpecialCreation(matches, game.grid);
    const result = removeAndCollapse(game.grid, matches, creation);

    game.score += result.points;
    spawnPopup(`+${result.points}`, canvas.clientWidth / 2, 120, '#fff');
    if (result.comboText) showCombo(result.comboText);
    if (result.usedBomb) {
      sounds.bomb();
      for (const p of result.particles) spawnParticles(p.x, p.y, ['#f97316','#facc15','#ef4444','#ffffff']);
    } else if (result.comboText === 'MEGA SAMBAL!' || result.comboText === 'Sambal Storm!') sounds.combo();
    else sounds.match();

    if ((game.state.samMeter || 0) >= 100) {
      game.state.samMeter = 0;
      triggerSamPower();
    }
    updateUI();
    await new Promise(r => setTimeout(r, 320));
  }
  game.inputLocked = false;
  checkRound();
}

function checkRound() {
  if (game.score >= game.goal) {
    const reward = 25 + game.level * 6;
    game.state = addCoins(game.state, reward);
    if (isBossLevel(game.level)) game.state = addGems(game.state, 3);
    game.state.samWins = (game.state.samWins || 0) + 1;
    const leveled = maybeLevelSam(game.state);
    game.level += 1;
    game.state.level = game.level;
    game.state.maxUnlocked = Math.max(game.state.maxUnlocked, game.level);
    game.state = maybeStartChest(game.state);
    saveState(game.state);
    saveHighScore(game.level - 1, game.score);
    sounds.win();
    maybeAnimalBonus();
    syncLevelState();
    game.score = 0;
    game.grid = createBoard();
    updateUI();
    setMessage(`Level gehaald! +${reward} muntjes${isBossLevel(game.level-1) ? ' +3 gems (boss)' : ''}${leveled ? ' • Sam level up!' : ''}`);
    return;
  }

  if (game.moves <= 0) {
    game.state = spendLife(game.state);
    saveState(game.state);
    if (game.state.lives <= 0) setMessage('Geen levens meer. Wacht op regeneratie.');
    else {
      setMessage('Moves op. Probeer opnieuw.');
      game.score = 0;
      syncLevelState();
      game.grid = createBoard();
    }
    updateUI();
  }
}

function handleTile(x, y) {
  game.state = refreshLives(loadState());
  if (game.state.lives <= 0 || game.inputLocked) return;

  if (game.hammerMode && game.state.hammers > 0) {
    game.state.hammers -= 1;
    saveState(game.state);
    game.grid[y][x] = null;
    game.hammerMode = false;
    spawnParticles((x+.5)*(canvas.clientWidth/8), (y+.5)*(canvas.clientHeight/8), ['#60a5fa','#ffffff','#facc15']);
    sounds.bomb();
    refillGrid(game.grid);
    resolveBoardLoop();
    updateUI();
    return;
  }

  if (!game.selected) { game.selected = {x,y}; return; }
  if (game.selected.x === x && game.selected.y === y) { game.selected = null; return; }

  const adjacent = Math.abs(game.selected.x - x) + Math.abs(game.selected.y - y) === 1;
  if (!adjacent) { game.selected = {x,y}; return; }

  swapTiles(game.grid, game.selected, {x,y});
  const matches = findMatches(game.grid);
  if (!matches.length) {
    swapTiles(game.grid, game.selected, {x,y});
    game.selected = null;
    return;
  }
  game.moves -= 1;
  game.selected = null;
  updateUI();
  resolveBoardLoop();
}

canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / 72);
  const y = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / 72);
  if (x>=0 && x<8 && y>=0 && y<8) handleTile(x,y);
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  const rect = canvas.getBoundingClientRect(), t = e.touches[0];
  touchStart = {
    x: Math.floor(((t.clientX - rect.left) * (canvas.width / rect.width)) / 72),
    y: Math.floor(((t.clientY - rect.top) * (canvas.height / rect.height)) / 72)
  };
}, { passive:true });
canvas.addEventListener('touchend', (e) => {
  if (!touchStart) return;
  const rect = canvas.getBoundingClientRect(), t = e.changedTouches[0];
  const end = {
    x: Math.floor(((t.clientX - rect.left) * (canvas.width / rect.width)) / 72),
    y: Math.floor(((t.clientY - rect.top) * (canvas.height / rect.height)) / 72)
  };
  handleTile(touchStart.x, touchStart.y);
  if (touchStart.x !== end.x || touchStart.y !== end.y) handleTile(end.x, end.y);
  touchStart = null;
}, { passive:true });

$('playBtn').addEventListener('click', () => setMessage('Play!'));
$('shopBtn').addEventListener('click', () => setMessage('Shop staat rechts klaar.'));
$('dailyBtn').addEventListener('click', () => $('claimDaily').scrollIntoView({behavior:'smooth'}));
$('chestsBtn').addEventListener('click', () => $('openChest').scrollIntoView({behavior:'smooth'}));
$('skipBtn').addEventListener('click', () => {
  if ((game.state.gems || 0) < 10) return setMessage('Niet genoeg gems om level te skippen.');
  game.state.gems -= 10;
  game.level += 1;
  game.state.level = game.level;
  game.state.maxUnlocked = Math.max(game.state.maxUnlocked, game.level);
  syncLevelState();
  game.score = 0;
  game.grid = createBoard();
  saveState(game.state);
  updateUI();
  setMessage('Level overgeslagen met 10 gems.');
});
$('rewardAdBtn').addEventListener('click', () => {
  const res = rewardAd(loadState(), 'life');
  game.state = res.state;
  saveState(game.state);
  updateUI();
  setMessage(res.reward);
});
$('watchChestAd').addEventListener('click', () => {
  const res = speedUpChestByAd(loadState());
  game.state = res.state;
  saveState(game.state);
  updateUI();
  setMessage(res.message);
});

$('buyMoves').addEventListener('click', () => {
  const res = buyItem(loadState(), 'moves');
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.moves += 5; game.state = res.state; updateUI(); setMessage('+5 moves gekocht');
});
$('buyLife').addEventListener('click', () => {
  const res = buyItem(loadState(), 'life');
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; updateUI(); setMessage('+1 leven gekocht');
});
$('buyHammer').addEventListener('click', () => {
  const res = buyItem(loadState(), 'hammer');
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; game.hammerMode = true; updateUI(); setMessage('Hammer gekocht. Tik op een tegel.');
});
$('buySuperBoost').addEventListener('click', () => {
  const res = buyItem(loadState(), 'super');
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; game.state.samMeter = 100; saveState(game.state); updateUI(); setMessage('Super boost gekocht: Sam is direct klaar.');
});
$('buyDemoGems').addEventListener('click', () => {
  const res = buyItem(loadState(), 'gems25');
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; updateUI(); setMessage('+25 demo gems toegevoegd');
});
$('claimDaily').addEventListener('click', () => {
  const res = claimDaily(loadState());
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; updateUI(); setMessage(`Daily reward: ${res.rewardText} (dag ${res.streak})`);
});
$('openChest').addEventListener('click', () => {
  const res = openChest(loadState());
  if (!res.ok) return setMessage(res.message);
  saveState(res.state); game.state = res.state; updateUI(); setMessage(`Chest geopend: ${res.rewardText}`);
});
$('collectFactory').addEventListener('click', async () => {
  const { collectFactory } = await import('./systems/factory.js');
  const res = collectFactory(loadState());
  saveState(res.state); game.state = res.state; updateUI();
  setMessage(res.produced > 0 ? `Sambal-fabriek: +${res.produced} muntjes` : 'Nog niets geproduceerd.');
});
$('openBonusGame').addEventListener('click', async () => {
  if (!canOpenBonusLevel(game.level - 1)) return setMessage('Bonus minigame nog niet beschikbaar.');
  const res = playBonusMiniGame(loadState());
  saveState(res.state); game.state = res.state; updateUI(); setMessage(res.text);
});

setInterval(() => {
  game.state = refreshLives(loadState());
  saveState(game.state);
  updateUI();
}, 1000);

loadSprites().then((loaded) => {
  sprites = loaded;
  game.state = refreshLives(loadState());
  saveState(game.state);
  game.level = game.state.level;
  syncLevelState();
  game.grid = createBoard();
  updateUI();
  setMessage('V13 klaar. Ads, gems, skip level, bonus minigame en economie zijn toegevoegd.');
  (function draw(){
    drawBoard(ctx, game.grid, sprites, game.selected, game.hammerMode);
    requestAnimationFrame(draw);
  })();
});
