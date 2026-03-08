
const TILE_TYPES = ['red','orange','purple','yellow','green','fire'];
const BOMB = 'bomb';
const ROW = 'row';

export function randomType() {
  const roll = Math.random();
  if (roll < 0.05) return BOMB;
  return TILE_TYPES[Math.floor(Math.random() * TILE_TYPES.length)];
}

export function makeTile(type = randomType()) {
  return {
    type,
    scale: 1,
    alpha: 1,
    offsetY: 0,
    popping: false,
    popT: 0,
    selectedPulse: Math.random() * Math.PI * 2
  };
}

export function createBoard(width = 8, height = 8) {
  const grid = [];
  for (let y = 0; y < height; y++) {
    const row = [];
    for (let x = 0; x < width; x++) row.push(makeTile());
    grid.push(row);
  }
  while (findMatches(grid).length > 0) removeAndCollapse(grid, findMatches(grid), null);
  return grid;
}

export function swapTiles(grid, a, b) {
  const t = grid[a.y][a.x];
  grid[a.y][a.x] = grid[b.y][b.x];
  grid[b.y][b.x] = t;
}

export function findMatches(grid) {
  const hits = new Set();
  const size = grid.length;

  for (let y = 0; y < size; y++) {
    let run = 1;
    for (let x = 1; x <= size; x++) {
      const same = x < size && grid[y][x] && grid[y][x-1] && grid[y][x].type === grid[y][x-1].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k=0;k<run;k++) hits.add(`${x-1-k},${y}`);
        run = 1;
      }
    }
  }
  for (let x = 0; x < size; x++) {
    let run = 1;
    for (let y = 1; y <= size; y++) {
      const same = y < size && grid[y][x] && grid[y-1][x] && grid[y][x].type === grid[y-1][x].type;
      if (same) run++;
      else {
        if (run >= 3) for (let k=0;k<run;k++) hits.add(`${x},${y-1-k}`);
        run = 1;
      }
    }
  }
  return [...hits].map(s => {
    const [x,y] = s.split(',').map(Number);
    return {x,y};
  });
}


export function removeAndCollapse(grid, matches, creation) {
  const unique = new Set(matches.map(m => `${m.x},${m.y}`));
  let points = 0;
  let usedBomb = false;
  const particles = [];

  function mark(x, y) {
    if (x >= 0 && x < grid.length && y >= 0 && y < grid.length && grid[y][x]) {
      grid[y][x].popping = true;
      grid[y][x].popT = 0;
    }
  }

  unique.forEach((key) => {
    const [x,y] = key.split(',').map(Number);
    const tile = grid[y][x];
    if (!tile) return;

    if (tile.type === BOMB) {
      usedBomb = true;
      for (let yy = 0; yy < grid.length; yy++) {
        for (let xx = 0; xx < grid.length; xx++) {
          if (Math.abs(xx-x)<=1 && Math.abs(yy-y)<=1) mark(xx, yy);
        }
      }
      particles.push({ x: (x + .5) * 72, y: (y + .5) * 72 });
      points += 160;
    } else if (tile.type === ROW) {
      for (let xx = 0; xx < grid.length; xx++) mark(xx, y);
      points += 120;
    } else {
      mark(x, y);
      points += 40;
    }
  });

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid.length; x++) {
      if (grid[y][x] && grid[y][x].popping) grid[y][x] = null;
    }
  }

  if (creation) {
    grid[creation.y][creation.x] = makeTile(creation.type);
  }

  for (let x = 0; x < grid.length; x++) {
    const stack = [];
    for (let y = grid.length - 1; y >= 0; y--) if (grid[y][x]) stack.push(grid[y][x]);
    for (let y = grid.length - 1; y >= 0; y--) {
      if (stack.length) {
        const t = stack.shift();
        grid[y][x] = t;
        t.offsetY = -Math.random() * 40;
        t.popping = false;
        t.scale = 1;
        t.alpha = 1;
      } else {
        const t = makeTile();
        t.offsetY = -90 - Math.random() * 60;
        grid[y][x] = t;
      }
    }
  }

  const count = unique.size;
  let comboText = 'Nice!';
  if (count >= 7) comboText = 'MEGA SAMBAL!';
  else if (count >= 5) comboText = 'Sambal Storm!';
  else if (count >= 4) comboText = 'Spicy!';

  return { points, usedBomb, particles, comboText };
}
