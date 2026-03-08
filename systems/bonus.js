
export function canOpenBonusLevel(level) {
  return level > 0 && level % 25 === 0;
}
export function playBonusMiniGame(state) {
  const roll = Math.random();
  let text = '';
  if (roll < 0.45) {
    const amt = 80 + Math.floor(Math.random()*60);
    state.coins += amt;
    text = `Bonus minigame: +${amt} muntjes`;
  } else if (roll < 0.75) {
    state.gems = (state.gems||0) + 2;
    text = 'Bonus minigame: +2 gems';
  } else {
    state.hammers = (state.hammers||0) + 2;
    text = 'Bonus minigame: +2 hammers';
  }
  return { state, text };
}
