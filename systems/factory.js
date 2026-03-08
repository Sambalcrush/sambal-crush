
const RATE_PER_HOUR = 30;
export function collectFactory(state) {
  const now = Date.now();
  const last = state.factoryAt || now;
  const diffHours = (now - last) / (60*60*1000);
  const produced = Math.floor(diffHours * RATE_PER_HOUR);
  state.factoryAt = now;
  if (produced > 0) state.coins += produced;
  return { state, produced };
}
