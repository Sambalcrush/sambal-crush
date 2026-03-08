
const BRONZE = 30 * 60 * 1000;
const SILVER = 2 * 60 * 60 * 1000;
const GOLD = 8 * 60 * 60 * 1000;

export function maybeStartChest(state) {
  if (!state.chest) {
    const roll = Math.random();
    if (roll < 0.55) state.chest = { type:'bronze', readyAt: Date.now() + BRONZE };
    else if (roll < 0.88) state.chest = { type:'silver', readyAt: Date.now() + SILVER };
    else state.chest = { type:'gold', readyAt: Date.now() + GOLD };
  }
  return state;
}
export function chestStatus(state) {
  if (!state.chest) return { available:false, text:'Geen chest actief.' };
  const diff = state.chest.readyAt - Date.now();
  if (diff <= 0) return { available:true, text:`${state.chest.type} chest is klaar!` };
  const mins = Math.ceil(diff / 60000);
  return { available:false, text:`${state.chest.type} chest opent over ${mins} min.` };
}
export function speedUpChestByAd(state) {
  if (!state.chest) return { ok:false, state, message:'Geen chest actief.' };
  state.chest.readyAt = Math.max(Date.now(), state.chest.readyAt - 15 * 60 * 1000);
  return { ok:true, state, message:'Chest 15 min versneld.' };
}
export function openChest(state) {
  const status = chestStatus(state);
  if (!status.available) return { ok:false, state, message:status.text };
  let rewardText = '';
  const type = state.chest.type;
  if (type === 'bronze') {
    const amt = 40 + Math.floor(Math.random()*30);
    state.coins += amt; rewardText = `+${amt} muntjes`;
  } else if (type === 'silver') {
    state.coins += 100; state.hammers = (state.hammers||0)+1; rewardText = '+100 muntjes en +1 hammer';
  } else {
    state.coins += 180; state.gems = (state.gems||0)+3; state.lives = Math.min(5, state.lives + 1); rewardText = '+180 muntjes, +3 gems en +1 leven';
  }
  state.chest = null;
  return { ok:true, state, rewardText };
}
