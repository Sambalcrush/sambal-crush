
export function buildLevelMap(container, currentLevel, maxUnlocked, onClick) {
  container.innerHTML = '';
  for (let i = 1; i <= Math.max(15, maxUnlocked + 2); i++) {
    const node = document.createElement('button');
    node.className = 'level-node';
    if (i < currentLevel) node.classList.add('done');
    if (i === currentLevel) node.classList.add('current');
    if (i > maxUnlocked) {
      node.classList.add('locked');
      node.textContent = '🔒';
      node.disabled = true;
    } else {
      node.textContent = i;
      node.addEventListener('click', () => onClick(i));
    }
    container.appendChild(node);
  }
}
