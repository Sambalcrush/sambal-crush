
export const LEVELS = Array.from({length: 100}, (_, i) => ({
  id: i + 1,
  goal: 1200 + i * 500,
  moves: Math.max(10, 20 - Math.floor(i / 2)),
  boss: (i + 1) % 10 === 0
}));
export function goalForLevel(level) {
  const found = LEVELS.find(l => l.id === level);
  return found ? found.goal : 1200 + (level - 1) * 500;
}
export function movesForLevel(level) {
  const found = LEVELS.find(l => l.id === level);
  return found ? found.moves : Math.max(10, 20 - Math.floor((level - 1) / 2));
}
export function isBossLevel(level) {
  const found = LEVELS.find(l => l.id === level);
  return !!(found && found.boss);
}
