
export function canClaimDaily(state) {
  const now = Date.now();
  const last = state.dailyClaimAt || 0;
  const oneDay = 24 * 60 * 60 * 1000;
  return now - last >= oneDay;
}
export function claimDaily(state) {
  if (!canClaimDaily(state)) return { ok:false, state, message:'Daily reward al geclaimd.' };
  const streak = (state.dailyStreak || 0) + 1;
  state.dailyStreak = streak > 7 ? 1 : streak;
  state.dailyClaimAt = Date.now();

  const rewardTable = [
    { coins:20 }, { coins:30 }, { hammer:1 }, { coins:50 }, { lives:1 }, { coins:80 }, { superChest:true }
  ];
  const reward = rewardTable[state.dailyStreak - 1];
  let text = '';
  if (reward.coins) { state.coins += reward.coins; text = `+${reward.coins} muntjes`; }
  if (reward.hammer) { state.hammers = (state.hammers||0)+1; text = '+1 hammer'; }
  if (reward.lives) { state.lives = Math.min(5, state.lives + reward.lives); text = '+1 leven'; }
  if (reward.superChest) { state.superChest = (state.superChest||0)+1; text = '+1 super chest'; }

  return { ok:true, state, rewardText:text, streak: state.dailyStreak };
}
