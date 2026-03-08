
export function saveHighScore(level, score) {
  const rows = JSON.parse(localStorage.getItem('sambal_v13_leaderboard') || '[]');
  rows.push({ level, score, date: Date.now() });
  rows.sort((a,b) => b.score - a.score);
  localStorage.setItem('sambal_v13_leaderboard', JSON.stringify(rows.slice(0, 10)));
}
export function loadLeaderboard() {
  return JSON.parse(localStorage.getItem('sambal_v13_leaderboard') || '[]');
}
