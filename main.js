
import { loadSprites, drawBoard, spawnPopup, showCombo, spawnParticles, attachBoardContext } from './ui/effects.js';
import { createBoard, swapTiles, findMatches, removeAndCollapse } from './engine/board.js';
import { resolveSpecialCreation } from './engine/powerups.js';
import { goalForLevel, movesForLevel, isBossLevel } from './systems/levels.js';
import { loadState, saveState, refreshLives, spendLife } from './systems/lives.js';
import { addCoins, addGems } from './systems/economy.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const ctx = canvas.getContext('2d');
attachBoardContext({ canvas, popupLayer: $('scorePopups'), comboOverlay: $('comboOverlay') });

let sprites = {};
let game = { grid: [], selected: null, score: 0, level: 1, moves: 20, goal: 1200, state: loadState(), inputLocked: false };

const mapPositions = [
  {x:150,y:120},{x:330,y:95},{x:520,y:115},{x:700,y:165},{x:905,y:150},
  {x:1020,y:305},{x:860,y:365},{x:640,y:390},{x:410,y:405},{x:205,y:520},
  {x:170,y:690},{x:330,y:820},{x:545,y:840},{x:770,y:820},{x:980,y:760},
  {x:1030,y:940},{x:870,y:1120},{x:650,y:1145},{x:450,y:1210},{x:245,y:1320},
  {x:220,y:1470},{x:430,y:1490},{x:665,y:1480},{x:880,y:1430},{x:1030,y:1320},
];

function toast(msg){
  const el = $('message');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove('show'), 1800);
}

function setActiveScreen(id){
  for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
  $(id).classList.add('active');
}

function syncHomeStats(){
  const s = refreshLives(loadState());
  saveState(s);
  $('homeLevel').textContent = s.level || 1;
  $('homeCoins').textContent = s.coins || 0;
  $('homeGems').textContent = s.gems || 0;
  $('homeLives').textContent = s.lives || 5;
}

function updateIngameUI(){
  $('score').textContent = game.score;
  $('level').textContent = game.level;
  $('moves').textContent = game.moves;
  $('goal').textContent = game.goal;
}

function buildMap(){
  const nodesWrap = $('mapNodes');
  nodesWrap.innerHTML = '';
  const s = refreshLives(loadState());
  const currentLevel = s.level || 1;
  const maxUnlocked = s.maxUnlocked || 1;

  mapPositions.forEach((pos, idx) => {
    const level = idx + 1;
    const btn = document.createElement('button');
    btn.className = 'map-node';
    btn.style.left = `${pos.x}px`;
    btn.style.top = `${pos.y}px`;

    if (level % 25 === 0) btn.classList.add('bonus');
    else if (level % 10 === 0) btn.classList.add('boss');

    if (level < currentLevel) btn.classList.add('done');
    else if (level === currentLevel) btn.classList.add('current');
    else if (level > maxUnlocked) btn.classList.add('locked');

    if (level > maxUnlocked) {
      btn.textContent = '🔒';
      btn.disabled = true;
    } else {
      btn.textContent = level % 25 === 0 ? '🎁' : level % 10 === 0 ? '👑' : level;
      btn.addEventListener('click', () => startLevel(level));
    }
    nodesWrap.appendChild(btn);
  });

  const currentPos = mapPositions[Math.min(currentLevel - 1, mapPositions.length - 1)];
  if (currentPos) $('mapScroll').scrollTo({ top: Math.max(0, currentPos.y - 220), behavior: 'smooth' });
}

function startLevel(level){
  game.level = level;
  game.score = 0;
  game.selected = null;
  game.goal = goalForLevel(level);
  game.moves = movesForLevel(level);
  game.grid = createBoard();
  updateIngameUI();
  setActiveScreen('gameScreen');
  toast(`Level ${level} gestart`);
}

function showPanel(title, body){
  $('panelTitle').textContent = title;
  $('panelBody').innerHTML = body;
  $('panelModal').classList.remove('hidden');
}

function showWinModal(text){
  $('winTitle').textContent = `Level ${game.level} gehaald!`;
  $('winText').textContent = text;
  $('winModal').classList.remove('hidden');
}
function closeWinModal(){ $('winModal').classList.add('hidden'); }
function closePanel(){ $('panelModal').classList.add('hidden'); }

function playTone(freq, dur, type='sine', gain=0.03, when=0) {
  if (!window.AudioContext && !window.webkitAudioContext) return;
  if (!playTone.ctx) playTone.ctx = new (window.AudioContext || window.webkitAudioContext)();
  const ac = playTone.ctx, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.value = freq; g.gain.value = gain; o.connect(g); g.connect(ac.destination);
  const now = ac.currentTime + when;
  o.start(now); o.stop(now + dur);
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
}
const sounds = {
  match(){ playTone(620,.08,'triangle',.03); playTone(780,.08,'triangle',.024,.06); },
  combo(){ playTone(520,.08,'square',.03); playTone(720,.08,'square',.03,.05); playTone(960,.1,'square',.02,.11); },
  win(){ playTone(520,.08,'triangle',.03); playTone(660,.08,'triangle',.03,.08); playTone(820,.12,'triangle',.03,.16); },
  bomb(){ playTone(160,.08,'sawtooth',.04); playTone(90,.16,'sawtooth',.03,.04); }
};

async function resolveBoardLoop() {
  game.inputLocked = true;
  while (true) {
    const matches = findMatches(game.grid);
    if (!matches.length) break;
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
    updateIngameUI();
    await new Promise(r => setTimeout(r, 320));
  }
  game.inputLocked = false;
  checkRound();
}

function winLevel(){
  let s = refreshLives(loadState());
  const reward = 25 + game.level * 6;
  s = addCoins(s, reward);
  if (isBossLevel(game.level)) s = addGems(s, 3);
  s.level = Math.max((s.level || 1), game.level + 1);
  s.maxUnlocked = Math.max((s.maxUnlocked || 1), game.level + 1);
  saveState(s);
  syncHomeStats();
  buildMap();
  sounds.win();
  const extra = isBossLevel(game.level) ? ' en +3 gems' : '';
  showWinModal(`Je kreeg +${reward} muntjes${extra}. Level ${game.level + 1} is nu vrijgespeeld.`);
}

function loseLevel(){
  let s = refreshLives(loadState());
  s = spendLife(s);
  saveState(s);
  syncHomeStats();
  if (s.lives <= 0) toast('Geen levens meer. Wacht op regeneratie.');
  else toast('Moves op. Probeer opnieuw.');
  setActiveScreen('mapScreen');
}

function checkRound(){
  if (game.score >= game.goal) return winLevel();
  if (game.moves <= 0) return loseLevel();
}

function handleTile(x, y) {
  const s = refreshLives(loadState());
  if (s.lives <= 0 || game.inputLocked) return;
  if (!game.selected) return void (game.selected = {x,y});
  if (game.selected.x === x && game.selected.y === y) return void (game.selected = null);
  const adjacent = Math.abs(game.selected.x - x) + Math.abs(game.selected.y - y) === 1;
  if (!adjacent) return void (game.selected = {x,y});
  swapTiles(game.grid, game.selected, {x,y});
  const matches = findMatches(game.grid);
  if (!matches.length) {
    swapTiles(game.grid, game.selected, {x,y});
    game.selected = null;
    return;
  }
  game.moves -= 1;
  game.selected = null;
  updateIngameUI();
  resolveBoardLoop();
}

canvas.addEventListener('click', (e) => {
  if (!$('gameScreen').classList.contains('active')) return;
  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(((e.clientX - rect.left) * (canvas.width / rect.width)) / 72);
  const y = Math.floor(((e.clientY - rect.top) * (canvas.height / rect.height)) / 72);
  if (x>=0 && x<8 && y>=0 && y<8) handleTile(x,y);
});

let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  if (!$('gameScreen').classList.contains('active')) return;
  const rect = canvas.getBoundingClientRect(), t = e.touches[0];
  touchStart = {
    x: Math.floor(((t.clientX - rect.left) * (canvas.width / rect.width)) / 72),
    y: Math.floor(((t.clientY - rect.top) * (canvas.height / rect.height)) / 72)
  };
}, { passive:true });

canvas.addEventListener('touchend', (e) => {
  if (!touchStart || !$('gameScreen').classList.contains('active')) return;
  const rect = canvas.getBoundingClientRect(), t = e.changedTouches[0];
  const end = {
    x: Math.floor(((t.clientX - rect.left) * (canvas.width / rect.width)) / 72),
    y: Math.floor(((t.clientY - rect.top) * (canvas.height / rect.height)) / 72)
  };
  handleTile(touchStart.x, touchStart.y);
  if (touchStart.x !== end.x || touchStart.y !== end.y) handleTile(end.x, end.y);
  touchStart = null;
}, { passive:true });

$('playBtn').addEventListener('click', () => { syncHomeStats(); buildMap(); setActiveScreen('mapScreen'); });
$('backHomeBtn').addEventListener('click', () => { syncHomeStats(); setActiveScreen('homeScreen'); });
$('leaveLevelBtn').addEventListener('click', () => { buildMap(); setActiveScreen('mapScreen'); });
$('nextLevelBtn').addEventListener('click', () => { closeWinModal(); startLevel(game.level + 1); });
$('backToMapBtn').addEventListener('click', () => { closeWinModal(); buildMap(); setActiveScreen('mapScreen'); });
$('closePanelBtn').addEventListener('click', closePanel);

$('shopBtn').addEventListener('click', () => showPanel('Shop', '<p>Shop flow komt hier. Voor nu focussen we op homescreen → roadmap → fullscreen level.</p>'));
$('dailyBtn').addEventListener('click', () => showPanel('Daily reward', '<p>Daily reward flow komt hier. Dit scherm kunnen we straks mooi stylen.</p>'));
$('chestsBtn').addEventListener('click', () => showPanel('Chests', '<p>Chest flow komt hier. We kunnen straks een echte chest-open animatie maken.</p>'));

setInterval(syncHomeStats, 1000);

loadSprites().then((loaded) => {
  sprites = loaded;
  syncHomeStats();
  buildMap();
  setActiveScreen('homeScreen');
  game.grid = createBoard();
  (function draw(){
    drawBoard(ctx, game.grid, sprites, game.selected, false);
    requestAnimationFrame(draw);
  })();
});
