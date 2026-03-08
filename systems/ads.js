
export function rewardAd(state, type) {
  if (type === 'life') {
    state.lives = Math.min(5, state.lives + 1);
    return { ok:true, state, reward:'+1 leven via rewarded ad' };
  }
  if (type === 'coins') {
    state.coins += 20;
    return { ok:true, state, reward:'+20 muntjes via rewarded ad' };
  }
  if (type === 'moves') {
    return { ok:true, state, reward:'+3 moves via rewarded ad', moves:3 };
  }
  return { ok:false, state, reward:'Onbekende ad reward' };
}
