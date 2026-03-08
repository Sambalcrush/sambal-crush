
let canvasRef, popupLayerRef, comboOverlayRef;

export function attachBoardContext(ctx) {
  canvasRef = ctx.canvas;
  popupLayerRef = ctx.popupLayer;
  comboOverlayRef = ctx.comboOverlay;
}

const files = {
  red:'assets/tiles/red.svg',
  orange:'assets/tiles/orange.svg',
  purple:'assets/tiles/purple.svg',
  yellow:'assets/tiles/yellow.svg',
  green:'assets/tiles/green.svg',
  fire:'assets/tiles/fire.svg',
  bomb:'assets/tiles/bomb.svg',
  row:'assets/tiles/row.svg'
};

export function loadSprites() {
  const map = {};
  return Promise.all(Object.entries(files).map(([key, src]) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { map[key] = img; resolve(); };
    img.src = src;
  }))).then(() => map);
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x+r, y);
  ctx.arcTo(x+w, y, x+w, y+h, r);
  ctx.arcTo(x+w, y+h, x, y+h, r);
  ctx.arcTo(x, y+h, x, y, r);
  ctx.arcTo(x, y, x+w, y, r);
  ctx.closePath();
}

export function drawBoard(ctx, grid, sprites, selected, hammerMode) {
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
  const bg = ctx.createLinearGradient(0,0,0,ctx.canvas.height);
  bg.addColorStop(0, '#fff4f4');
  bg.addColorStop(1, '#fffdfd');
  ctx.fillStyle = bg;
  ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);

  for (let y=0;y<8;y++) {
    for (let x=0;x<8;x++) {
      const bx = x*72 + 4;
      const by = y*72 + 4;
      roundedRect(ctx, bx, by, 64, 64, 18);
      ctx.fillStyle = 'rgba(255,255,255,.35)';
      ctx.fill();
    }
  }

  for (let y=0;y<8;y++) {
    for (let x=0;x<8;x++) {
      const tile = grid[y][x];
      if (!tile) continue;
      const px = x*72 + 6;
      const py = y*72 + 6 + tile.offsetY;
      const size = 60;
      const img = sprites[tile.type];

      if (tile.offsetY < 0) tile.offsetY = Math.min(0, tile.offsetY + 10);
      const isSelected = selected && selected.x === x && selected.y === y;
      const pulse = isSelected ? 1 + 0.05 * Math.sin(performance.now() / 100) : 1;

      ctx.save();
      ctx.translate(px + size/2, py + size/2);
      ctx.scale(pulse, pulse);
      if (img) ctx.drawImage(img, -size/2, -size/2, size, size);

      if (isSelected || hammerMode) {
        ctx.strokeStyle = isSelected ? '#22c55e' : '#f59e0b';
        ctx.lineWidth = 4;
        roundedRect(ctx, -size/2, -size/2, size, size, 16);
        ctx.stroke();
      }
      ctx.restore();
    }
  }
}

export function spawnPopup(text, x, y, color='#fff') {
  const div = document.createElement('div');
  div.className = 'score-popup';
  div.textContent = text;
  div.style.left = `${x}px`;
  div.style.top = `${y}px`;
  div.style.color = color;
  popupLayerRef.appendChild(div);
  setTimeout(() => div.remove(), 1000);
}

export function showCombo(text) {
  comboOverlayRef.textContent = text;
  comboOverlayRef.classList.remove('show');
  comboOverlayRef.offsetWidth;
  comboOverlayRef.classList.add('show');
}

export function spawnParticles(x, y, colors) {
  for (let i=0;i<16;i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = `${x}px`;
    p.style.top = `${y}px`;
    p.style.background = colors[i % colors.length];
    p.style.setProperty('--tx', `${(Math.random()-0.5)*100}px`);
    p.style.setProperty('--ty', `${(Math.random()-0.5)*100}px`);
    popupLayerRef.appendChild(p);
    setTimeout(() => p.remove(), 650);
  }
}
