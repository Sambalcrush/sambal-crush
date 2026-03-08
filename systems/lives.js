
const MAX_LIVES = 5;
const LIFE_REGEN_MS = 15 * 60 * 1000;

export function defaultState() {
  return { coins: 0, lives: 5, lifeTimestamp: Date.now(), level: 1, maxUnlocked: 1, hammers: 0 };
}

export function loadState() {
  try {
    return { ...defaultState(), ...(JSON.parse(localStorage.getItem('sambal_v10_state')) || {}) };
  } catch {
    return defaultState();
  }
}

export function saveState(state) {
  localStorage.setItem('sambal_v10_state', JSON.stringify(state));
}

export function refreshLives(state) {
  const s = { ...state };
  if (s.lives < MAX_LIVES) {
    const gained = Math.floor((Date.now() - s.lifeTimestamp) / LIFE_REGEN_MS);
    if (gained > 0) {
      s.lives = Math.min(MAX_LIVES, s.lives + gained);
      s.lifeTimestamp = Date.now();
    }
  }
  return s;
}

export function spendLife(state) {
  const s = refreshLives(state);
  s.lives = Math.max(0, s.lives - 1);
  s.lifeTimestamp = Date.now();
  return s;
}

export function nextLifeRemaining(state) {
  const s = refreshLives(state);
  if (s.lives >= MAX_LIVES) return 'Volle levens beschikbaar.';
  const passed = Date.now() - s.lifeTimestamp;
  const ms = Math.max(0, LIFE_REGEN_MS - (passed % LIFE_REGEN_MS));
  const total = Math.ceil(ms / 1000);
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const sec = String(total % 60).padStart(2, '0');
  return `${m}:${sec}`;
}

export function buyItem(state, type) {
  const s = refreshLives(state);
  if (type === 'moves') {
    if (s.coins < 30) return { ok:false, message:'Niet genoeg muntjes.', state:s };
    s.coins -= 30;
    return { ok:true, state:s };
  }
  if (type === 'life') {
    if (s.coins < 50) return { ok:false, message:'Niet genoeg muntjes.', state:s };
    if (s.lives >= 5) return { ok:false, message:'Je levens zijn al vol.', state:s };
    s.coins -= 50;
    s.lives += 1;
    return { ok:true, state:s };
  }
  if (type === 'hammer') {
    if (s.coins < 40) return { ok:false, message:'Niet genoeg muntjes.', state:s };
    s.coins -= 40;
    s.hammers += 1;
    return { ok:true, state:s };
  }
  return { ok:false, message:'Onbekende aankoop.', state:s };
}
