/** Original vector machinery for Relay Defense. No external sprites. */
export function paintGarden(g, { cols, rows, tile, path }) {
  g.fillStyle(0x111e30); g.fillRect(0, 0, cols * tile, rows * tile);
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = col * tile, y = row * tile;
    g.fillStyle((col + row) % 2 ? 0x17273b : 0x1b2c42);
    g.fillRoundedRect(x + 4, y + 4, tile - 8, tile - 8, 4);
    g.lineStyle(1, 0x334962, 0.6); g.lineBetween(x + 12, y + 12, x + 22, y + 12);
    g.fillStyle(0x536b82, 0.5); g.fillCircle(x + 12, y + 64, 2);
  }
  for (const [width, color] of [[54, 0x091322], [44, 0x6a7b8c], [34, 0xb1c1c6]]) {
    g.lineStyle(width, color); g.beginPath();
    path.forEach(([col, row], i) => {
      if (i === 0) g.moveTo(col * tile + tile / 2, row * tile + tile / 2);
      else g.lineTo(col * tile + tile / 2, row * tile + tile / 2);
    });
    g.strokePath();
  }
  for (let i = 0; i < path.length - 1; i++) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    const distance = Math.abs(bx - ax) + Math.abs(by - ay);
    for (let n = 1; n < distance; n++) {
      const x = (ax + dx * n) * tile + tile / 2, y = (ay + dy * n) * tile + tile / 2;
      g.fillStyle(0x526579);
      g.fillTriangle(x + dx * 9, y + dy * 9, x - dx * 6 + dy * 6, y - dy * 6 - dx * 6, x - dx * 6 - dy * 6, y - dy * 6 + dx * 6);
    }
  }
  const [sx, sy] = path[0].map(n => n * tile + tile / 2);
  g.lineStyle(6, 0xff8768); g.strokeRect(sx - 22, sy - 28, 44, 56);
  g.fillStyle(0xff8768, 0.25); g.fillRect(sx - 16, sy - 22, 32, 44);
  const [x, y] = path.at(-1).map(n => n * tile + tile / 2);
  g.fillStyle(0x081322); g.fillRoundedRect(x - 29, y - 31, 58, 62, 8);
  g.lineStyle(3, 0x6ee7c2); g.strokeRoundedRect(x - 26, y - 28, 52, 56, 6);
  for (let n = 0; n < 3; n++) {
    g.fillStyle(0x28495b); g.fillRect(x - 17, y - 19 + n * 16, 34, 11);
    g.fillStyle(0x6ee7c2); g.fillRect(x - 13, y - 16 + n * 16, 5, 5);
  }
}

export function drawTower(g, item, time, building) {
  const { x, y, color } = item;
  g.fillStyle(0x060d17, 0.6); g.fillEllipse(x, y + 20, 60, 18);
  g.fillStyle(0x263c52); g.fillRoundedRect(x - 25, y - 22, 50, 44, 7);
  g.lineStyle(2, color, building ? 0.4 : 1); g.strokeRoundedRect(x - 25, y - 22, 50, 44, 7);
  if (item.kind === 'wall') {
    for (let i = -1; i <= 1; i++) { g.fillStyle(color, 0.8); g.fillRect(x + i * 14 - 4, y - 18, 8, 36); }
    g.fillStyle(0xffc268); g.fillRect(x - 22, y + 27, 44 * Math.max(0, item.remainingMs / item.durationMs), 4);
  } else if (item.kind === 'frost') {
    g.fillStyle(color, 0.18); g.fillCircle(x, y, 20);
    g.lineStyle(3, color); g.strokeCircle(x, y, 16);
    g.lineBetween(x - 22, y, x + 22, y); g.lineBetween(x, y - 22, x, y + 22);
    g.fillStyle(0xe2f3ff); g.fillCircle(x, y, 6);
  } else {
    const angle = Math.atan2((item.aimY ?? y - 1) - y, (item.aimX ?? x) - x);
    const length = time < item.kickUntil ? 20 : 29;
    g.lineStyle(item.kind === 'rocket' ? 14 : 8, color);
    g.lineBetween(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
    g.fillStyle(color); g.fillCircle(x, y, item.kind === 'rocket' ? 15 : 12);
    g.fillStyle(0x152437); g.fillCircle(x, y, 6);
    if (time < item.kickUntil) { g.fillStyle(0xfff3d0); g.fillCircle(x + Math.cos(angle) * 33, y + Math.sin(angle) * 33, 5); }
  }
  if (building) {
    const p = Math.max(0, Math.min(1, (time - item.buildStartedAt) / (item.buildReadyAt - item.buildStartedAt)));
    g.fillStyle(0x091322); g.fillRect(x - 24, y + 28, 48, 5);
    g.fillStyle(0x6ee7c2); g.fillRect(x - 24, y + 28, 48 * p, 5);
  }
}

export function drawEnemy(g, enemy, time) {
  const { x, y, radius: r } = enemy;
  const slowed = time < enemy.slowUntil;
  g.fillStyle(0x030911, 0.5); g.fillEllipse(x, y + r, r * 2.3, 10);
  g.fillStyle(time < enemy.flashUntil ? 0xffffff : slowed ? 0x79bbff : enemy.color);
  if (enemy.isBoss) {
    g.fillRoundedRect(x - r, y - r * 0.7, r * 2, r * 1.4, 4);
    g.lineStyle(5, 0x503f50); g.lineBetween(x - r + 4, y - r, x + r - 4, y - r); g.lineBetween(x - r + 4, y + r, x + r - 4, y + r);
  } else if (enemy.kind === 'fast') {
    g.fillTriangle(x + r, y, x - r, y - r * 0.8, x - r * 0.55, y);
    g.fillTriangle(x + r, y, x - r, y + r * 0.8, x - r * 0.55, y);
  } else {
    g.fillTriangle(x, y - r, x + r, y, x, y + r);
    g.fillTriangle(x, y - r, x - r, y, x, y + r);
  }
  g.fillStyle(0x132032); g.fillRect(x - 5, y - 3, 10, 6);
  if (slowed) { g.lineStyle(2, 0x79bbff); g.strokeCircle(x, y, r + 6); }
  const width = enemy.isBoss ? 60 : 30;
  g.fillStyle(0x091322); g.fillRect(x - width / 2, y - r - 10, width, 4);
  g.fillStyle(enemy.isBoss ? 0xff8768 : 0xffc268); g.fillRect(x - width / 2, y - r - 10, width * Math.max(0, enemy.hp / enemy.maxHp), 4);
}

export function drawShot(g, shot) {
  g.fillStyle(shot.color, 0.18); g.fillCircle(shot.x, shot.y, shot.splash ? 12 : 7);
  g.fillStyle(shot.color); g.fillCircle(shot.x, shot.y, shot.splash ? 6 : 3);
}

export function drawCrumbs(g, crumbs, time) {
  for (const c of crumbs) {
    const life = Math.max(0, (c.until - time) / c.life);
    g.fillStyle(c.color, life); g.fillRect(c.x, c.y, c.r * life, c.r * life);
  }
}
