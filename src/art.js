/** Original Candy Garden drawing. Not from Server Survival. */

export function paintGarden(g, { cols, rows, tile, path, theme, reduced }) {
  const w = cols * tile, h = rows * tile;
  g.fillStyle(theme.bg, 1);
  g.fillRect(0, 0, w, h);
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = col * tile, y = row * tile;
      g.fillStyle((row + col) % 2 === 0 ? theme.tileA : theme.tileB, 1);
      g.fillRoundedRect(x + 5, y + 5, tile - 10, tile - 10, 16);
      if (!reduced && (col * 3 + row * 7) % 11 === 0 && !onPath(col, row, path)) {
        g.fillStyle(theme.bloom, 0.9);
        g.fillCircle(x + tile * 0.72, y + tile * 0.28, 5);
        g.fillStyle(theme.bloomCore, 1);
        g.fillCircle(x + tile * 0.72, y + tile * 0.28, 2);
      }
    }
  }
  g.lineStyle(54, theme.roadEdge, 1);
  strokePath(g, path, tile);
  g.lineStyle(38, theme.road, 1);
  strokePath(g, path, tile);
  g.lineStyle(14, theme.icing, 0.95);
  strokePath(g, path, tile);
  const start = path[0];
  const end = path[path.length - 1];
  drawGate(g, start[0] * tile + tile / 2, start[1] * tile + tile / 2, theme);
  drawCake(g, end[0] * tile + tile / 2, end[1] * tile + tile / 2, theme);
}

function onPath(col, row, path) {
  for (let i = 0; i < path.length - 1; i += 1) {
    const [ax, ay] = path[i], [bx, by] = path[i + 1];
    if (col >= Math.min(ax, bx) && col <= Math.max(ax, bx) && row >= Math.min(ay, by) && row <= Math.max(ay, by)) return true;
  }
  return false;
}

function strokePath(g, path, tile) {
  g.beginPath();
  path.forEach(([col, row], i) => {
    const x = col * tile + tile / 2, y = row * tile + tile / 2;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  });
  g.strokePath();
}

function drawGate(g, x, y, theme) {
  g.fillStyle(theme.gate, 1);
  g.fillRoundedRect(x - 28, y - 34, 12, 48, 6);
  g.fillRoundedRect(x + 16, y - 34, 12, 48, 6);
  g.fillStyle(theme.gateTop, 1);
  g.fillRoundedRect(x - 32, y - 42, 64, 14, 7);
}

function drawCake(g, x, y, theme) {
  g.fillStyle(0x000000, 0.12);
  g.fillEllipse(x, y + 22, 36, 10);
  g.fillStyle(theme.cake, 1);
  g.fillRoundedRect(x - 22, y - 6, 44, 26, 8);
  g.fillStyle(theme.frosting, 1);
  g.fillRoundedRect(x - 24, y - 18, 48, 18, 9);
  g.fillStyle(theme.cherry, 1);
  g.fillCircle(x, y - 22, 7);
  g.fillStyle(0xfff6d8, 0.7);
  g.fillCircle(x - 2, y - 24, 2);
}

export function drawTower(g, item, time, building) {
  const kick = time < (item.kickUntil || 0) ? 1.08 : 1;
  const x = item.x, y = item.y;
  g.fillStyle(0x3a4a32, 0.16);
  g.fillEllipse(x, y + 18 * kick, 22, 8);
  if (item.kind === "wall") {
    const life = item.remainingMs == null ? 1 : Math.max(0.28, item.remainingMs / item.durationMs);
    g.fillStyle(item.color, 0.35 + 0.5 * life);
    g.fillRoundedRect(x - 22, y - 16, 44, 32, 8);
    g.fillStyle(0xf3d7a4, 1);
    g.fillRoundedRect(x - 18, y - 12, 16, 10, 3);
    g.fillRoundedRect(x + 2, y - 4, 16, 10, 3);
    g.fillRoundedRect(x - 10, y + 6, 16, 10, 3);
    return;
  }
  if (item.kind === "fighter") {
    g.fillStyle(0xf4efe4, 1);
    g.fillRoundedRect(x - 4, y - 4, 8, 22, 3);
    g.fillStyle(0xef5f8f, 1);
    g.fillCircle(x, y - 16 * kick, 16 * kick);
    g.fillStyle(0xfff6fb, 0.85);
    g.fillCircle(x - 4, y - 20 * kick, 5);
    return;
  }
  if (item.kind === "rocket") {
    g.fillStyle(0xd9a15a, 1);
    g.fillRoundedRect(x - 14, y + 2, 28, 16, 4);
    g.fillStyle(0x36a985, 1);
    g.fillEllipse(x, y - 4 * kick, 28 * kick, 20 * kick);
    g.fillStyle(0xef5f8f, 1);
    g.fillCircle(x, y - 16 * kick, 5);
    return;
  }
  g.fillStyle(0xfff4dc, 1);
  g.fillTriangle(x - 12, y + 16, x + 12, y + 16, x, y - 6);
  g.fillStyle(0x7ec8ff, 1);
  g.fillCircle(x, y - 10 * kick, 14 * kick);
  g.fillStyle(0xffffff, 0.7);
  g.fillCircle(x - 4, y - 14 * kick, 4);
  if (building) {
    g.fillStyle(0x25314d, 0.8);
    g.fillRoundedRect(x - 24, y + 26, 48, 6, 3);
    const p = Math.max(0, Math.min(1, (time - item.buildStartedAt) / Math.max(1, item.buildReadyAt - item.buildStartedAt)));
    g.fillStyle(0xffd166, 1);
    g.fillRoundedRect(x - 24, y + 26, 48 * p, 6, 3);
  }
}

export function drawEnemy(g, enemy, time) {
  const slowed = time < enemy.slowUntil;
  const flash = time < (enemy.flashUntil || 0);
  g.fillStyle(0x3a4a32, 0.18);
  g.fillEllipse(enemy.x, enemy.y + enemy.radius, enemy.radius + 4, 7);
  const color = flash ? 0xffffff : slowed ? 0x9ee7ff : enemy.color;
  g.fillStyle(color, 1);
  if (enemy.kind === "tank" || enemy.isBoss) {
    g.fillRoundedRect(enemy.x - enemy.radius, enemy.y - enemy.radius * 0.7, enemy.radius * 2, enemy.radius * 1.4, 8);
  } else {
    g.fillCircle(enemy.x, enemy.y, enemy.radius);
  }
  g.lineStyle(3, enemy.isBoss ? 0xff8fc7 : 0xffffff, 0.9);
  if (enemy.kind === "tank" || enemy.isBoss) {
    g.strokeRoundedRect(enemy.x - enemy.radius, enemy.y - enemy.radius * 0.7, enemy.radius * 2, enemy.radius * 1.4, 8);
  } else {
    g.strokeCircle(enemy.x, enemy.y, enemy.radius);
  }
  g.fillStyle(0x25314d, 0.85);
  g.fillCircle(enemy.x - 5, enemy.y - 3, 3);
  g.fillCircle(enemy.x + 5, enemy.y - 3, 3);
  if (slowed) {
    g.lineStyle(2, 0x7ec8ff, 0.7);
    g.strokeCircle(enemy.x, enemy.y, enemy.radius + 6);
  }
  const width = enemy.isBoss ? 64 : 40;
  const ratio = Math.max(0, enemy.hp / enemy.maxHp);
  g.fillStyle(0x25314d, 0.9);
  g.fillRoundedRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width, 6, 3);
  g.fillStyle(enemy.isBoss ? 0xff8fc7 : 0x7bc47f, 1);
  g.fillRoundedRect(enemy.x - width / 2, enemy.y - enemy.radius - 12, width * ratio, 6, 3);
}

export function drawShot(g, shot) {
  g.fillStyle(shot.color, 1);
  g.fillCircle(shot.x, shot.y, shot.splash > 0 ? 7 : 5);
  g.fillStyle(0xffffff, 0.55);
  g.fillCircle(shot.x - 1, shot.y - 1, 2);
}

export function drawCrumbs(g, crumbs, time) {
  for (const crumb of crumbs) {
    const t = 1 - (crumb.until - time) / crumb.life;
    if (t >= 1) continue;
    g.fillStyle(crumb.color, 1 - t);
    g.fillCircle(crumb.x, crumb.y, Math.max(1.5, crumb.r * (1 - t)));
  }
}
