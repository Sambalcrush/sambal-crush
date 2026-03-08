
export function addCoins(state, amount) {
  state.coins += amount;
  return state;
}
export function addGems(state, amount) {
  state.gems = (state.gems || 0) + amount;
  return state;
}
export function spendCoins(state, amount) {
  if (state.coins < amount) return { ok:false, state, message:'Niet genoeg muntjes.' };
  state.coins -= amount;
  return { ok:true, state };
}
export function spendGems(state, amount) {
  if ((state.gems || 0) < amount) return { ok:false, state, message:'Niet genoeg gems.' };
  state.gems -= amount;
  return { ok:true, state };
}
export function buyShopItem(state, type) {
  const coinCosts = { moves:30, life:50, hammer:40, bomb:60, super:80 };
  if (type === 'gems25') {
    state.gems = (state.gems || 0) + 25;
    return { ok:true, state };
  }
  const cost = coinCosts[type];
  if (!cost) return { ok:false, state, message:'Onbekend item.' };
  const spent = spendCoins(state, cost);
  if (!spent.ok) return spent;
  if (type === 'life') state.lives = Math.min(5, state.lives + 1);
  if (type === 'hammer') state.hammers = (state.hammers || 0) + 1;
  if (type === 'bomb') state.bombs = (state.bombs || 0) + 1;
  if (type === 'super') state.superBoosts = (state.superBoosts || 0) + 1;
  return { ok:true, state };
}
