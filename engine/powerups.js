
export function resolveSpecialCreation(matches, grid) {
  if (matches.length >= 7) {
    return { x: matches[0].x, y: matches[0].y, type: 'bomb' };
  }
  if (matches.length >= 5) {
    return { x: matches[0].x, y: matches[0].y, type: 'bomb' };
  }
  if (matches.length === 4) {
    return { x: matches[0].x, y: matches[0].y, type: 'row' };
  }
  return null;
}
