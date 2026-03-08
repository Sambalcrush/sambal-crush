
export function chargeSam(state, amount) {
  state.samMeter = Math.min(100, (state.samMeter || 0) + amount);
  return state;
}
export function maybeLevelSam(state) {
  const target = state.samLevel * 3;
  if ((state.samWins || 0) >= target) {
    state.samLevel += 1;
    state.samWins = 0;
    return true;
  }
  return false;
}
export function samPowerCoverage(state) {
  const lvl = state.samLevel || 1;
  if (lvl >= 10) return 0.9;
  if (lvl >= 5) return 0.55;
  if (lvl >= 3) return 0.4;
  return 0.3;
}
