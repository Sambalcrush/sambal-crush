
export function applyDevMode(state, enabled) {
  if (enabled) {
    state.coins += 1000;
    state.lives = 5;
    state.hammers = (state.hammers || 0) + 5;
  }
  return state;
}
export function adminGiveCoins(state, amount) {
  state.coins += amount;
  return state;
}
export function adminGiveLives(state, amount) {
  state.lives = Math.min(5, state.lives + amount);
  return state;
}
export function adminUnlockLevel(state, level) {
  state.maxUnlocked = Math.max(state.maxUnlocked || 1, level);
  return state;
}
