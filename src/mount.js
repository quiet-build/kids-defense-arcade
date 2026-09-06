import Phaser from "phaser";
import markup from './ui.html?raw';
import { ownRuntime, SessionGame } from './runtime';

export function mount(container, ready = () => {}, result = () => {}) {
container.innerHTML = markup;
const listeners = new AbortController();
const listen = (element, name, handler) => element.addEventListener(name, handler, { signal: listeners.signal });
let disposed = false;
let paused = false;
let elapsed = 0;


const ui = {
  title: container.querySelector("#gameTitle"),
  subtitle: container.querySelector("#gameSubtitle"),
  themeSelect: container.querySelector("#themeSelect"),
  difficulty: container.querySelector("#difficulty"),
  endlessMode: container.querySelector("#endlessMode"),
  pauseButton: container.querySelector("#pauseButton"),
  startButton: container.querySelector("#startButton"),
  wave: container.querySelector("#waveText"),
  design: container.querySelector("#designText"),
  base: container.querySelector("#baseText"),
  money: container.querySelector("#moneyText"),
  boss: container.querySelector("#bossText"),
  message: container.querySelector("#message"),
  toolButtons: [...container.querySelectorAll(".tool-card")],
};

const TILE = 80;
const COLS = 12;
const ROWS = 8;
const WIDTH = COLS * TILE;
const HEIGHT = ROWS * TILE;
const roundLayouts = [
  {
    name: "Switchback",
    path: [
      [0, 4],
      [2, 4],
      [2, 2],
      [4, 2],
      [4, 6],
      [7, 6],
      [7, 3],
      [9, 3],
      [9, 5],
      [11, 5],
    ],
  },
  {
    name: "North Gate",
    path: [
      [0, 2],
      [3, 2],
      [3, 5],
      [5, 5],
      [5, 1],
      [8, 1],
      [8, 4],
      [11, 4],
    ],
  },
  {
    name: "Twin Bend",
    path: [
      [0, 5],
      [1, 5],
      [1, 1],
      [4, 1],
      [4, 4],
      [6, 4],
      [6, 6],
      [10, 6],
      [10, 2],
      [11, 2],
    ],
  },
  {
    name: "Long March",
    path: [
      [0, 3],
      [2, 3],
      [2, 6],
      [5, 6],
      [5, 3],
      [7, 3],
      [7, 1],
      [10, 1],
      [10, 5],
      [11, 5],
    ],
  },
];

const STARTING_MONEY = 600;

const difficulties = {
  rookie: { base: 32, money: STARTING_MONEY, hp: 0.82, speed: 0.86, count: 0.88, reward: 1.2 },
  normal: { base: 25, money: STARTING_MONEY, hp: 1, speed: 1, count: 1, reward: 1 },
  veteran: { base: 20, money: STARTING_MONEY, hp: 1.25, speed: 1.14, count: 1.18, reward: 0.88 },
};

const themes = {
  monster: {
    title: "Monster Base Defense",
    subtitle: "Build fighters, traps, and short-time walls to stop the monster army.",
    readyTitle: "Ready",
    startText: "Build units on empty ground. Kill enemies to earn credits.",
    clearText: "Mission clear. Turn on Endless Waves for a longer fight.",
    loseText: "Base destroyed. Try more Fighter Posts early, then add walls near the road.",
    blockerText: "Steel Wall deployed for a few seconds.",
    blockedPlacementText: "Combat units need open ground beside the road.",
    wallPlacementText: "Walls must be placed on the road to block enemies briefly.",
    baseIcon: "🏰",
    colors: {
      bg: 0x202822,
      tileA: 0x253527,
      tileB: 0x223024,
      road: 0x606c5b,
      roadCenter: 0x3f483c,
      overlay: 0x101827,
      text: "#eef5ff",
      stroke: "#101827",
    },
    tools: {
      fighter: { name: "Fighter Post", cost: 55, refund: 28, range: 150, damage: 13, cooldown: 560, color: 0x4fd18b, icon: "🪖", blocksPath: false },
      rocket: { name: "Rocket Squad", cost: 95, refund: 48, range: 190, damage: 32, cooldown: 1120, color: 0xff9d42, icon: "🚀", blocksPath: false },
      frost: { name: "Freeze Trap", cost: 70, refund: 35, range: 118, damage: 5, cooldown: 850, slowMs: 1200, color: 0x58b9ff, icon: "❄️", blocksPath: false },
      wall: { name: "Steel Wall", cost: 45, refund: 20, durationMs: 6500, color: 0xa8b4c8, icon: "🧱", blocksPath: true },
    },
    enemies: [
      { kind: "monster", label: "Monster", face: "👹", color: 0xe05055, hp: 52, speed: 58, reward: 18, damage: 1 },
      { kind: "soldier", label: "Evil Soldier", face: "🪖", color: 0x6d7480, hp: 70, speed: 50, reward: 24, damage: 1 },
      { kind: "tank", label: "Tank", face: "🚜", color: 0x334155, hp: 155, speed: 31, reward: 48, damage: 3 },
    ],
    bosses: [
      { label: "Iron Tank Boss", face: "🛡️", color: 0x94a3b8, hp: 2.0, speed: 0.7, reward: 95, damage: 5 },
      { label: "Lava Monster", face: "🔥", color: 0xff6b35, hp: 1.55, speed: 0.95, reward: 82, damage: 4 },
      { label: "Shadow Commander", face: "☠️", color: 0x7c3aed, hp: 1.7, speed: 0.88, reward: 88, damage: 4 },
    ],
  },
  candy: {
    title: "Candy Garden Defense",
    subtitle: "Protect the rainbow cake with candy towers, chill traps, and cookie walls.",
    readyTitle: "Ready",
    startText: "Build candy helpers on grass. Stop candy monsters to earn jelly beans.",
    clearText: "Garden saved. Turn on Endless Waves to keep playing.",
    loseText: "The cake was taken. Try more Lollipop Towers and Cookie Walls.",
    blockerText: "Cookie Wall placed for a few seconds.",
    blockedPlacementText: "Candy towers need grass beside the path.",
    wallPlacementText: "Cookie Walls must be placed on the candy path.",
    baseIcon: "🎂",
    colors: {
      bg: 0xdff8ca,
      tileA: 0xd9f3c3,
      tileB: 0xceecb8,
      road: 0xf6c36f,
      roadCenter: 0xfff1b6,
      overlay: 0xffffff,
      text: "#25314d",
      stroke: "#ffffff",
    },
    tools: {
      fighter: { name: "Lollipop Tower", cost: 40, refund: 20, range: 145, damage: 12, cooldown: 550, color: 0xef5f8f, icon: "🍭", blocksPath: false },
      rocket: { name: "Cupcake Cannon", cost: 75, refund: 38, range: 175, damage: 27, cooldown: 1020, color: 0x36a985, icon: "🧁", blocksPath: false },
      frost: { name: "Snow Cone Trap", cost: 60, refund: 30, range: 118, damage: 5, cooldown: 850, slowMs: 1300, color: 0x58b9ff, icon: "🍧", blocksPath: false },
      wall: { name: "Cookie Wall", cost: 35, refund: 18, durationMs: 6500, color: 0xe3a44f, icon: "🍪", blocksPath: true },
    },
    enemies: [
      { kind: "monster", label: "Candy Monster", face: "🍬", color: 0xffb347, hp: 46, speed: 58, reward: 16, damage: 1 },
      { kind: "soldier", label: "Gummy Raider", face: "🍮", color: 0x55c8ff, hp: 68, speed: 50, reward: 22, damage: 1 },
      { kind: "tank", label: "Chocolate Tank", face: "🍫", color: 0x8f5b3f, hp: 145, speed: 31, reward: 44, damage: 3 },
    ],
    bosses: [
      { label: "Marshmallow Giant", face: "☁️", color: 0xff8fc7, hp: 1.7, speed: 0.82, reward: 88, damage: 4 },
      { label: "Jelly King", face: "🍮", color: 0x55c8ff, hp: 1.55, speed: 0.96, reward: 82, damage: 4 },
      { label: "Cookie Queen", face: "🍪", color: 0xe3a44f, hp: 1.75, speed: 0.88, reward: 86, damage: 4 },
    ],
  },
};

let selectedTool = "fighter";
let selectedTheme = "monster";
let sceneRef = null;

class BaseDefenseScene extends Phaser.Scene {
  constructor() {
    super("BaseDefenseScene");
  }

  create() {
    sceneRef = this;
    this.graphics = this.add.graphics();
    this.labels = [];
    this.built = [];
    this.enemies = [];
    this.projectiles = [];
    this.running = false;
    this.wave = 1;
    this.baseHp = 25;
    this.money = STARTING_MONEY;
    this.spawnsLeft = 0;
    this.nextSpawnAt = 0;
    this.currentBoss = null;
    this.currentLayout = roundLayouts[0];
    this.difficulty = difficulties.normal;
    this.endless = false;
    this.won = false;
    this.input.on("pointerdown", (pointer) => this.handlePointer(pointer));
    this.drawFrame();
    applyThemeUi();
    this.drawOverlay(currentTheme().readyTitle);
    updateUi(this);
    if (!disposed) ready();
  }

  startMission() {
    resume();
    this.clearMission();
    elapsed = 0;
    ui.pauseButton.disabled = false;
    this.running = true;
    this.won = false;
    this.wave = 1;
    selectedTheme = ui.themeSelect.value;
    this.endless = ui.endlessMode.checked;
    this.difficultyId = ui.difficulty.value;
    this.difficulty = difficulties[this.difficultyId];
    this.baseHp = this.difficulty.base;
    this.money = this.difficulty.money;
    applyThemeUi();
    ui.message.textContent = currentTheme().startText;
    this.startWave();
  }

  startWave() {
    this.currentLayout = roundLayouts[(this.wave - 1) % roundLayouts.length];
    this.currentBoss = Phaser.Utils.Array.GetRandom(currentTheme().bosses);
    this.spawnsLeft = Math.round((8 + this.wave * 2.2) * this.difficulty.count);
    this.nextSpawnAt = elapsed + 280;
    ui.boss.textContent = this.currentBoss.label;
    ui.message.textContent = `Round ${this.wave}: ${this.currentLayout.name}. New route, new boss.`;
    updateUi(this);
  }

  update(_time, delta) {
    elapsed += delta;
    const time = elapsed;
    this.drawFrame();
    if (this.running) {
      this.updateSpawns(time);
      this.updateBuilt(time);
      this.moveEnemies(delta / 1000, time);
      this.updateProjectiles(delta / 1000, time);
      this.checkWaveComplete();
    }
    this.drawActors(time);
    if (!this.running) this.drawOverlay(this.won ? "Mission Clear" : currentTheme().readyTitle);
    updateUi(this);
  }

  updateSpawns(time) {
    if (this.spawnsLeft > 0 && time >= this.nextSpawnAt) {
      this.spawnsLeft -= 1;
      this.spawnEnemy(false);
      this.nextSpawnAt = time + Math.max(360, 980 - this.wave * 22);
    }

    const bossAlive = this.enemies.some((enemy) => enemy.isBoss);
    if (this.spawnsLeft === 0 && !bossAlive) {
      this.spawnEnemy(true);
      this.spawnsLeft = -1;
    }
  }

  spawnEnemy(isBoss) {
    const theme = currentTheme();
    const base = isBoss
      ? {
          kind: "boss",
          label: this.currentBoss.label,
          face: this.currentBoss.face,
          color: this.currentBoss.color,
          hp: 210 + this.wave * 55,
          speed: 33 * this.currentBoss.speed,
          reward: this.currentBoss.reward,
          damage: this.currentBoss.damage,
        }
      : Phaser.Utils.Array.GetRandom(theme.enemies);
    const hp = base.hp * this.difficulty.hp * (isBoss ? this.currentBoss.hp : 1) + this.wave * (isBoss ? 18 : 7);
    this.enemies.push({
      ...base,
      x: this.currentLayout.path[0][0] * TILE + TILE / 2,
      y: this.currentLayout.path[0][1] * TILE + TILE / 2,
      pathIndex: 1,
      hp,
      maxHp: hp,
      speed: base.speed * this.difficulty.speed,
      reward: Math.round(base.reward * this.difficulty.reward),
      radius: isBoss ? 27 : base.kind === "tank" ? 23 : 18,
      isBoss,
      slowUntil: 0,
      blockedUntil: 0,
      blocker: null,
    });
  }

  updateBuilt(time) {
    for (let i = this.built.length - 1; i >= 0; i -= 1) {
      const item = this.built[i];
      if (isBuilding(item, time)) continue;
      if (item.kind === "wall" && item.expiresAt === null) {
        item.expiresAt = time + item.durationMs;
      }
      if (item.kind === "wall" && time >= item.expiresAt) {
        this.built.splice(i, 1);
        continue;
      }
      if (item.kind === "wall" || time < item.readyAt) continue;

      const target = this.findTarget(item);
      if (!target) continue;

      item.readyAt = time + item.cooldown;
      if (item.kind === "frost") {
        target.slowUntil = Math.max(target.slowUntil, time + item.slowMs);
      }
      this.projectiles.push({
        x: item.x,
        y: item.y,
        target,
        speed: item.kind === "rocket" ? 330 : 430,
        damage: item.damage,
        color: item.color,
        splash: item.kind === "rocket" ? 38 : 0,
      });
    }
  }

  findTarget(item) {
    let best = null;
    let bestProgress = -1;
    for (const enemy of this.enemies) {
      const distance = Phaser.Math.Distance.Between(item.x, item.y, enemy.x, enemy.y);
      if (distance <= item.range && enemy.pathIndex > bestProgress) {
        best = enemy;
        bestProgress = enemy.pathIndex;
      }
    }
    return best;
  }

  moveEnemies(dt, time) {
    for (let i = this.enemies.length - 1; i >= 0; i -= 1) {
      const enemy = this.enemies[i];
      if (time < enemy.blockedUntil) continue;

      const wall = this.findBlockingWall(enemy);
      if (wall) {
        enemy.blockedUntil = time + 520;
        enemy.blocker = wall;
        wall.hp -= enemy.isBoss ? 2 : 1;
        if (wall.hp <= 0) this.built = this.built.filter((item) => item !== wall);
        continue;
      }

      const target = this.currentLayout.path[enemy.pathIndex];
      const tx = target[0] * TILE + TILE / 2;
      const ty = target[1] * TILE + TILE / 2;
      const dx = tx - enemy.x;
      const dy = ty - enemy.y;
      const dist = Math.hypot(dx, dy);
      const slow = time < enemy.slowUntil ? 0.48 : 1;
      const step = enemy.speed * slow * dt;

      if (dist <= step) {
        enemy.x = tx;
        enemy.y = ty;
        enemy.pathIndex += 1;
        if (enemy.pathIndex >= this.currentLayout.path.length) {
          this.enemies.splice(i, 1);
          this.baseHp -= enemy.damage;
          if (this.baseHp <= 0) this.endMission(false);
        }
      } else {
        enemy.x += (dx / dist) * step;
        enemy.y += (dy / dist) * step;
      }
    }
  }

  findBlockingWall(enemy) {
    return this.built.find((item) => {
      if (item.kind !== "wall" || isBuilding(item, elapsed)) return false;
      const distance = Phaser.Math.Distance.Between(item.x, item.y, enemy.x, enemy.y);
      return distance < 42;
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.projectiles[i];
      if (!this.enemies.includes(projectile.target)) {
        this.projectiles.splice(i, 1);
        continue;
      }

      const dx = projectile.target.x - projectile.x;
      const dy = projectile.target.y - projectile.y;
      const dist = Math.hypot(dx, dy);
      const step = projectile.speed * dt;

      if (dist <= step) {
        this.hitEnemy(projectile.target, projectile.damage, projectile.splash);
        this.projectiles.splice(i, 1);
      } else {
        projectile.x += (dx / dist) * step;
        projectile.y += (dy / dist) * step;
      }
    }
  }

  hitEnemy(target, damage, splash) {
    target.hp -= damage;
    if (splash > 0) {
      for (const enemy of this.enemies) {
        if (enemy === target) continue;
        const distance = Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y);
        if (distance <= splash) enemy.hp -= Math.round(damage * 0.38);
      }
    }

    const killed = this.enemies.filter((enemy) => enemy.hp <= 0);
    if (killed.length === 0) return;

    for (const enemy of killed) {
      this.money += enemy.reward;
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  checkWaveComplete() {
    if (this.spawnsLeft < 0 && this.enemies.length === 0) {
      this.money += 35 + this.wave * 5;
      if (!this.endless && this.wave >= 8) {
        this.endMission(true);
        return;
      }
      this.wave += 1;
      ui.message.textContent = `Wave ${this.wave - 1} cleared. New boss incoming.`;
      this.time.delayedCall(1500, () => {
        if (this.running) this.startWave();
      });
      this.spawnsLeft = -99;
    }
  }

  endMission(won) {
    if (!this.running) return;
    result({ mode: `${selectedTheme}-${this.difficultyId}-${this.endless ? "endless" : "mission"}`, result: won ? "won" : "lost", wave: this.wave });
    ui.pauseButton.disabled = true;
    this.running = false;
    this.won = won;
    ui.message.textContent = won
      ? currentTheme().clearText
      : currentTheme().loseText;
  }

  handlePointer(pointer) {
    if (!this.running) return;

    const col = Math.floor(pointer.x / TILE);
    const row = Math.floor(pointer.y / TILE);
    if (!insideGrid(col, row)) return;

    if (selectedTool === "remove") {
      this.removeBuilt(col, row);
      return;
    }

    const tool = currentTheme().tools[selectedTool];
    if (isRoadTile(col, row, this.currentLayout.path) && !tool.blocksPath) {
      ui.message.textContent = currentTheme().blockedPlacementText;
      return;
    }

    if (!isRoadTile(col, row, this.currentLayout.path) && tool.blocksPath) {
      ui.message.textContent = currentTheme().wallPlacementText;
      return;
    }

    if (this.built.some((item) => item.col === col && item.row === row)) {
      ui.message.textContent = "That tile is already occupied.";
      return;
    }

    if (this.money < tool.cost) {
      ui.message.textContent = `${tool.name} needs ${tool.cost} credits.`;
      return;
    }

    this.money -= tool.cost;
    this.built.push({
      ...tool,
      kind: selectedTool,
      col,
      row,
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
      readyAt: elapsed + buildTimeFor(tool),
      buildStartedAt: elapsed,
      buildReadyAt: elapsed + buildTimeFor(tool),
      hp: selectedTool === "wall" ? 8 : 1,
      expiresAt: null,
    });
    ui.message.textContent =
      selectedTool === "wall"
        ? `${tool.name} is being built. It will block after construction.`
        : `${tool.name} is being built. More expensive units take longer.`;
  }

  removeBuilt(col, row) {
    const index = this.built.findIndex((item) => item.col === col && item.row === row);
    if (index === -1) {
      ui.message.textContent = "Nothing to remove on that tile.";
      return;
    }
    const [removed] = this.built.splice(index, 1);
    this.money += removed.refund;
    ui.message.textContent = `${removed.name} removed. Refunded ${removed.refund} credits.`;
  }

  clearMission() {
    this.time.removeAllEvents();
    this.built = [];
    this.enemies = [];
    this.projectiles = [];
    this.currentBoss = null;
    this.currentLayout = roundLayouts[0];
  }

  drawFrame() {
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
    this.graphics.clear();
    const theme = currentTheme();
    this.graphics.fillStyle(theme.colors.bg, 1);
    this.graphics.fillRect(0, 0, WIDTH, HEIGHT);

    for (let row = 0; row < ROWS; row += 1) {
      for (let col = 0; col < COLS; col += 1) {
        this.graphics.fillStyle((row + col) % 2 === 0 ? theme.colors.tileA : theme.colors.tileB, 1);
        this.graphics.fillRoundedRect(col * TILE + 4, row * TILE + 4, TILE - 8, TILE - 8, 7);
      }
    }

    this.graphics.lineStyle(50, theme.colors.road, 1);
    this.strokeRoad();
    this.graphics.lineStyle(20, theme.colors.roadCenter, 1);
    this.strokeRoad();
    const end = this.currentLayout.path[this.currentLayout.path.length - 1];
    drawText(this, end[0] * TILE + TILE / 2, end[1] * TILE + TILE / 2, theme.baseIcon, 42);
  }

  strokeRoad() {
    this.graphics.beginPath();
    this.currentLayout.path.forEach(([col, row], index) => {
      const x = col * TILE + TILE / 2;
      const y = row * TILE + TILE / 2;
      if (index === 0) this.graphics.moveTo(x, y);
      else this.graphics.lineTo(x, y);
    });
    this.graphics.strokePath();
  }

  drawActors(time) {
    for (const item of this.built) {
      const alpha = item.kind === "wall" ? Math.max(0.35, (item.expiresAt - time) / item.durationMs) : 1;
      const building = isBuilding(item, time);
      this.graphics.fillStyle(item.color, building ? 0.14 : item.kind === "wall" ? alpha : 0.25);
      this.graphics.fillCircle(item.x, item.y, item.kind === "wall" ? 31 : 26);
      drawText(this, item.x, item.y, item.icon, item.kind === "wall" ? 32 : 30);
      if (building) {
        const progress = buildProgress(item, time);
        this.graphics.fillStyle(0x101827, 0.82);
        this.graphics.fillRoundedRect(item.x - 28, item.y + 30, 56, 7, 3);
        this.graphics.fillStyle(0xffd166, 1);
        this.graphics.fillRoundedRect(item.x - 28, item.y + 30, 56 * progress, 7, 3);
        drawText(this, item.x, item.y - 32, "BUILD", 12, "bold");
      }
      if (item.kind === "wall") {
        this.graphics.fillStyle(0xff5d6c, 1);
        this.graphics.fillRoundedRect(item.x - 26, item.y + 29, 52 * (item.hp / 8), 6, 3);
      }
    }

    for (const enemy of this.enemies) {
      const slowed = time < enemy.slowUntil;
      this.graphics.fillStyle(slowed ? 0x58b9ff : enemy.color, 1);
      this.graphics.fillCircle(enemy.x, enemy.y, enemy.radius);
      drawText(this, enemy.x, enemy.y, enemy.face, enemy.isBoss ? 26 : 20);
      this.drawHpBar(enemy);
    }

    for (const projectile of this.projectiles) {
      this.graphics.fillStyle(projectile.color, 1);
      this.graphics.fillCircle(projectile.x, projectile.y, projectile.splash > 0 ? 8 : 6);
    }
  }

  drawHpBar(enemy) {
    const width = enemy.isBoss ? 70 : 44;
    const ratio = Math.max(0, enemy.hp / enemy.maxHp);
    this.graphics.fillStyle(0x101827, 1);
    this.graphics.fillRoundedRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width, 7, 3);
    this.graphics.fillStyle(enemy.isBoss ? 0xff9d42 : 0x4fd18b, 1);
    this.graphics.fillRoundedRect(enemy.x - width / 2, enemy.y - enemy.radius - 14, width * ratio, 7, 3);
  }

  drawOverlay(title) {
    this.graphics.fillStyle(currentTheme().colors.overlay, selectedTheme === "candy" ? 0.64 : 0.68);
    this.graphics.fillRect(0, 0, WIDTH, HEIGHT);
    drawText(this, WIDTH / 2, HEIGHT / 2 - 24, title, 50, "bold");
    drawText(this, WIDTH / 2, HEIGHT / 2 + 34, "Choose difficulty, then start mission", 23, "bold");
  }
}

function drawText(scene, x, y, text, size, weight = "normal") {
  const label = scene.add
    .text(x, y, text, {
      fontFamily: "Arial, sans-serif",
      fontSize: `${size}px`,
      fontStyle: weight,
      color: currentTheme().colors.text,
      stroke: currentTheme().colors.stroke,
      strokeThickness: size > 30 ? 5 : 3,
    })
    .setOrigin(0.5);
  scene.labels.push(label);
}

function insideGrid(col, row) {
  return col >= 0 && col < COLS && row >= 0 && row < ROWS;
}

function isRoadTile(col, row, route) {
  for (let i = 0; i < route.length - 1; i += 1) {
    const [ax, ay] = route[i];
    const [bx, by] = route[i + 1];
    const minX = Math.min(ax, bx);
    const maxX = Math.max(ax, bx);
    const minY = Math.min(ay, by);
    const maxY = Math.max(ay, by);
    if (col >= minX && col <= maxX && row >= minY && row <= maxY) return true;
  }
  return false;
}

function buildTimeFor(tool) {
  return Math.round(450 + tool.cost * 18);
}

function isBuilding(item, time) {
  return time < item.buildReadyAt;
}

function buildProgress(item, time) {
  const total = item.buildReadyAt - item.buildStartedAt;
  if (total <= 0) return 1;
  return Phaser.Math.Clamp((time - item.buildStartedAt) / total, 0, 1);
}

function updateUi(scene) {
  ui.wave.textContent = String(scene.wave);
  ui.design.textContent = scene.currentLayout.name;
  ui.base.textContent = String(Math.max(0, scene.baseHp));
  ui.money.textContent = String(scene.money);
  if (!scene.currentBoss) ui.boss.textContent = "Standby";
}

listen(ui.startButton, "click", () => sceneRef?.startMission());
listen(ui.themeSelect, "change", () => {
  resume();
  ui.pauseButton.disabled = true;
  selectedTheme = ui.themeSelect.value;
  selectedTool = "fighter";
  applyThemeUi();
  if (!sceneRef) return;
  sceneRef.clearMission();
  sceneRef.running = false;
  sceneRef.won = false;
  sceneRef.wave = 1;
  sceneRef.baseHp = difficulties[ui.difficulty.value].base;
  sceneRef.money = STARTING_MONEY;
  sceneRef.drawFrame();
  sceneRef.drawOverlay(currentTheme().readyTitle);
  updateUi(sceneRef);
});
ui.toolButtons.forEach((button) => {
  listen(button, "click", () => {
    selectedTool = button.dataset.tool;
    ui.toolButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

function currentTheme() {
  return themes[selectedTheme];
}

function applyThemeUi() {
  const theme = currentTheme();
  ui.title.textContent = theme.title;
  ui.subtitle.textContent = theme.subtitle;
  ui.toolButtons.forEach((button) => {
    const toolId = button.dataset.tool;
    if (toolId === "remove") {
      button.innerHTML = "<span>🛠️</span>Remove<small>refund 50%</small>";
      button.classList.toggle("active", selectedTool === "remove");
      return;
    }
    const tool = theme.tools[toolId];
    button.innerHTML = `<span>${tool.icon}</span>${tool.name}<small>${tool.cost} credits</small>`;
    button.classList.toggle("active", selectedTool === toolId);
  });
}

let disposeRuntime = () => {};
const canvasHost = container.querySelector("#game");
canvasHost.tabIndex = 0;
new SessionGame({
  autoFocus: false,
  audio: { noAudio: true },
  input: { windowEvents: false, keyboard: false, mouse: { target: canvasHost }, touch: { target: canvasHost } },
  callbacks: { preBoot(game) { disposeRuntime = ownRuntime(game); if (disposed) disposeRuntime(); } },
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: canvasHost,
  backgroundColor: "#202822",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BaseDefenseScene],
});

function pause() {
  if (disposed || !sceneRef?.running || paused) return;
  paused = true;
  sceneRef.scene.pause();
  ui.pauseButton.textContent = 'Resume';
}
function resume() {
  if (!paused) return;
  paused = false;
  sceneRef.scene.resume();
  ui.pauseButton.textContent = 'Pause';
}
listen(ui.pauseButton, 'click', () => paused ? resume() : pause());
listen(container, 'focusout', event => { if (!container.contains(event.relatedTarget)) pause(); });
listen(canvasHost, 'pointerdown', () => canvasHost.focus({ preventScroll: true }));
listen(window, 'blur', pause);
listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
return { pause, dispose() { if (disposed) return; disposed = true; listeners.abort(); disposeRuntime(); } };
}
