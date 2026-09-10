import Phaser from "phaser";
import markup from './ui.html?raw';
import { ownRuntime, SessionGame } from './runtime';
import { LEVELS, calculateStars, evaluateObjectives, isToolAllowed, loadProgress, persistWin } from './levels';
import { paintGarden, drawTower, drawEnemy, drawShot, drawCrumbs } from './art';

const TILE = 80, COLS = 12, ROWS = 8, WIDTH = COLS * TILE, HEIGHT = ROWS * TILE;
const PACKS = {
  gumdrop: { kind: "monster", label: "Gumdrop", color: 0xff8aa5, hp: 36, speed: 48, reward: 11, damage: 1, radius: 16 },
  swarm: { kind: "monster", label: "Jelly bean", color: 0xffb347, hp: 20, speed: 64, reward: 7, damage: 1, radius: 13 },
  fast: { kind: "soldier", label: "Gummy raider", color: 0x55c8ff, hp: 32, speed: 80, reward: 13, damage: 1, radius: 15 },
};
const difficulties = {
  rookie: { hp: 0.82, speed: 0.86, count: 0.88, reward: 1.15, hearts: 2 },
  normal: { hp: 1, speed: 1, count: 1, reward: 1, hearts: 0 },
  veteran: { hp: 1.22, speed: 1.12, count: 1.1, reward: 0.9, hearts: -2 },
};
const themes = {
  candy: {
    title: "Candy Garden",
    subtitle: "Protect the cake.",
    startText: "Place a candy tower beside the path, then start the wave.",
    loseText: "The cake was taken. Cover the path sooner.",
    blockedPlacementText: "Candy towers need grass beside the path.",
    wallPlacementText: "Cookie Walls must be placed on the candy path.",
    tools: {
      fighter: { name: "Lollipop Tower", role: "Fast single", cost: 40, refund: 20, range: 145, damage: 12, cooldown: 550, color: 0xef5f8f, blocksPath: false },
      rocket: { name: "Cupcake Cannon", role: "Splash", cost: 75, refund: 38, range: 175, damage: 27, cooldown: 1020, color: 0x36a985, blocksPath: false },
      frost: { name: "Snow Cone Trap", role: "Slow", cost: 60, refund: 30, range: 118, damage: 5, cooldown: 850, slowMs: 1300, color: 0x58b9ff, blocksPath: false },
      wall: { name: "Cookie Wall", role: "Brief block", cost: 35, refund: 18, durationMs: 6500, color: 0xe3a44f, blocksPath: true },
    },
    art: { bg: 0xdff3c8, tileA: 0xd5eeb8, tileB: 0xc8e6a8, road: 0xf0c56e, roadEdge: 0xd9a24c, icing: 0xfff4c8, bloom: 0xff8fb8, bloomCore: 0xfff6fb, gate: 0x7bc47f, gateTop: 0xe35d86, cake: 0xf3c6a0, frosting: 0xfff6fb, cherry: 0xe35d86 },
  },
  monster: {
    title: "Monster Base Defense",
    subtitle: "Hold the gate.",
    startText: "Place a tower beside the road, then start the wave.",
    loseText: "Base destroyed. Try more towers on the corners.",
    blockedPlacementText: "Combat units need open ground beside the road.",
    wallPlacementText: "Walls must be placed on the road to block enemies briefly.",
    tools: {
      fighter: { name: "Fighter Post", role: "Fast single", cost: 55, refund: 28, range: 150, damage: 13, cooldown: 560, color: 0x4fd18b, blocksPath: false },
      rocket: { name: "Rocket Squad", role: "Splash", cost: 95, refund: 48, range: 190, damage: 32, cooldown: 1120, color: 0xff9d42, blocksPath: false },
      frost: { name: "Freeze Trap", role: "Slow", cost: 70, refund: 35, range: 118, damage: 5, cooldown: 850, slowMs: 1200, color: 0x58b9ff, blocksPath: false },
      wall: { name: "Steel Wall", role: "Brief block", cost: 45, refund: 20, durationMs: 6500, color: 0xa8b4c8, blocksPath: true },
    },
    art: { bg: 0x243028, tileA: 0x2c3b31, tileB: 0x24342a, road: 0x6a7460, roadEdge: 0x3f483c, icing: 0x9aa58c, bloom: 0x4fd18b, bloomCore: 0xdff8ca, gate: 0x4a5c4e, gateTop: 0x94a3b8, cake: 0x445044, frosting: 0x8aa090, cherry: 0xe05055 },
  },
};

export function mount(container, ready = () => {}, result = () => {}) {
container.innerHTML = markup;
const listeners = new AbortController();
const listen = (element, name, handler) => element.addEventListener(name, handler, { signal: listeners.signal });
container.addEventListener('pointerdown', event => {
  const button = event.target instanceof Element ? event.target.closest('button:not(:disabled)') : null;
  if (button && event.button === 0) {
    event.preventDefault();
    button.focus({ preventScroll: true });
  }
}, { capture: true, signal: listeners.signal });
let disposed = false;
let paused = false;
let elapsed = 0;
let selectedTool = "fighter";
let selectedTheme = "candy";
let selectedLevelId = 1;
let sceneRef = null;
let resultSent = false;
const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const ui = {
  app: container.querySelector(".app"),
  title: container.querySelector("#gameTitle"),
  subtitle: container.querySelector("#gameSubtitle"),
  themeSelect: container.querySelector("#themeSelect"),
  difficulty: container.querySelector("#difficulty"),
  endlessMode: container.querySelector("#endlessMode"),
  pauseButton: container.querySelector("#pauseButton"),
  startButton: container.querySelector("#startButton"),
  waveButton: container.querySelector("#waveButton"),
  nextButton: container.querySelector("#nextButton"),
  wave: container.querySelector("#waveText"),
  design: container.querySelector("#designText"),
  base: container.querySelector("#baseText"),
  money: container.querySelector("#moneyText"),
  boss: container.querySelector("#bossText"),
  message: container.querySelector("#message"),
  briefing: container.querySelector("#briefing"),
  debrief: container.querySelector("#debrief"),
  briefTitle: container.querySelector("#briefTitle"),
  briefBody: container.querySelector("#briefBody"),
  briefGoals: container.querySelector("#briefGoals"),
  levelKicker: container.querySelector("#levelKicker"),
  levelPicks: container.querySelector("#levelPicks"),
  goalLine: container.querySelector("#goalLine"),
  debriefTitle: container.querySelector("#debriefTitle"),
  debriefBody: container.querySelector("#debriefBody"),
  debriefStars: container.querySelector("#debriefStars"),
  debriefGoals: container.querySelector("#debriefGoals"),
  debriefHint: container.querySelector("#debriefHint"),
  debriefKicker: container.querySelector("#debriefKicker"),
  toolButtons: [...container.querySelectorAll(".tool-card")],
};

class BaseDefenseScene extends Phaser.Scene {
  constructor() { super("BaseDefenseScene"); }

  create() {
    sceneRef = this;
    this.graphics = this.add.graphics();
    this.built = [];
    this.enemies = [];
    this.projectiles = [];
    this.crumbs = [];
    this.running = false;
    this.ended = false;
    this.wave = 1;
    this.level = LEVELS[0];
    this.currentLayout = this.level.layout;
    this.baseHp = this.level.base;
    this.startHp = this.level.base;
    this.money = this.level.budget;
    this.startMoney = this.level.budget;
    this.spawnsLeft = 0;
    this.nextSpawnAt = 0;
    this.currentBoss = this.level.boss;
    this.difficulty = difficulties.normal;
    this.endless = false;
    this.won = false;
    this.spawning = false;
    this.hover = { col: -1, row: -1 };
    this.leaks = 0;
    this.kills = 0;
    this.combatSec = 0;
    this.hurtUntil = 0;
    this.input.on("pointerdown", (pointer) => this.handlePointer(pointer));
    this.input.on("pointermove", (pointer) => this.hoverTile(pointer));
    this.input.on("pointerout", () => { this.hover = { col: -1, row: -1 }; });
    applyThemeUi();
    renderBriefing();
    updateUi(this);
    if (!disposed) ready();
  }

  startMission() {
    resume();
    this.clearMission();
    elapsed = 0;
    resultSent = false;
    this.ended = false;
    this.running = true;
    this.won = false;
    this.wave = 1;
    selectedTheme = ui.themeSelect.value;
    this.endless = ui.endlessMode.checked;
    this.difficultyId = ui.difficulty.value;
    this.difficulty = difficulties[this.difficultyId];
    this.level = LEVELS[selectedLevelId - 1];
    this.currentLayout = this.level.layout;
    this.startHp = Math.max(4, this.level.base + this.difficulty.hearts);
    this.baseHp = this.startHp;
    this.startMoney = this.level.budget;
    this.money = this.level.budget;
    this.currentBoss = this.level.boss;
    this.leaks = 0;
    this.kills = 0;
    this.combatSec = 0;
    applyThemeUi();
    ui.pauseButton.disabled = false;
    ui.debrief.classList.add("hidden");
    ui.message.textContent = currentTheme().startText;
    this.enterPrepare();
  }

  enterPrepare() {
    this.spawning = false;
    this.spawnsLeft = 0;
    this.enemies = [];
    this.projectiles = [];
    ui.waveButton.disabled = false;
    ui.boss.textContent = this.level.incoming;
    const total = this.level.waves.length;
    ui.message.textContent = `Wave ${this.wave} of ${total}. Incoming ${this.level.incoming}. Place towers, then start the wave.`;
    updateUi(this);
  }

  startWave() {
    if (!this.running || this.spawning || this.ended) return;
    this.spawning = true;
    const wave = this.level.waves[(this.wave - 1) % this.level.waves.length];
    this.spawnsLeft = Math.max(1, Math.round(wave.count * this.difficulty.count));
    this.nextSpawnAt = elapsed + 280;
    const root = ui.waveButton.getRootNode();
    if (root.activeElement === ui.waveButton) canvasHost.focus({ preventScroll: true });
    ui.waveButton.disabled = true;
    ui.message.textContent = `Wave ${this.wave}: ${this.currentLayout.name}. Enemies incoming.`;
    updateUi(this);
  }

  update(_time, delta) {
    if (this.running && !this.ended) elapsed += delta;
    const time = elapsed;
    this.graphics.clear();
    paintGarden(this.graphics, { cols: COLS, rows: ROWS, tile: TILE, path: this.currentLayout.path, theme: currentTheme().art, reduced });
    if (this.running && !this.ended) {
      if (this.spawning) {
        this.combatSec += delta / 1000;
        this.updateSpawns(time);
      }
      this.updateBuilt(time, delta);
      this.moveEnemies(delta / 1000, time);
      this.updateProjectiles(delta / 1000, time);
      this.checkWaveComplete();
    }
    this.crumbs = this.crumbs.filter((c) => c.until > time);
    for (const c of this.crumbs) {
      c.x += c.vx * delta / 1000;
      c.y += c.vy * delta / 1000;
    }
    this.drawActors(time);
    this.drawGhost();
    if (time < this.hurtUntil) {
      this.graphics.fillStyle(0xe35d86, 0.12);
      this.graphics.fillRect(0, 0, WIDTH, HEIGHT);
    }
    drawCrumbs(this.graphics, this.crumbs, time);
    updateUi(this);
  }

  updateSpawns(time) {
    if (this.spawnsLeft > 0 && time >= this.nextSpawnAt) {
      this.spawnsLeft -= 1;
      this.spawnEnemy(false);
      this.nextSpawnAt = time + Math.max(280, 720 - this.wave * 18);
    }
    const bossAlive = this.enemies.some((enemy) => enemy.isBoss);
    if (this.spawnsLeft === 0 && !bossAlive) {
      this.spawnEnemy(true);
      this.spawnsLeft = -1;
    }
  }

  spawnEnemy(isBoss) {
    const wave = this.level.waves[(this.wave - 1) % this.level.waves.length];
    const base = isBoss
      ? { ...this.level.boss, color: this.level.boss.color, hp: 120 + this.wave * 28, speed: 30 * this.level.boss.speed, reward: this.level.boss.reward, damage: this.level.boss.damage, radius: 26 }
      : PACKS[wave.pack];
    const hp = base.hp * this.difficulty.hp * (isBoss ? this.level.boss.hp : 1);
    this.enemies.push({
      ...base,
      x: this.currentLayout.path[0][0] * TILE + TILE / 2,
      y: this.currentLayout.path[0][1] * TILE + TILE / 2,
      pathIndex: 1,
      hp,
      maxHp: hp,
      speed: base.speed * this.difficulty.speed,
      reward: Math.round(base.reward * this.difficulty.reward),
      radius: isBoss ? 26 : base.radius,
      isBoss,
      slowUntil: 0,
      flashUntil: 0,
      blockedUntil: 0,
      blocker: null,
    });
  }

  updateBuilt(time, delta) {
    for (let i = this.built.length - 1; i >= 0; i -= 1) {
      const item = this.built[i];
      if (isBuilding(item, time)) continue;
      if (item.kind === "wall") {
        if (this.spawning) {
          item.remainingMs -= delta;
          if (item.remainingMs <= 0) this.built.splice(i, 1);
        }
        continue;
      }
      if (time < item.readyAt) continue;
      const target = this.findTarget(item);
      if (!target) continue;
      item.readyAt = time + item.cooldown;
      item.kickUntil = time + 90;
      if (item.kind === "frost") target.slowUntil = Math.max(target.slowUntil, time + item.slowMs);
      this.projectiles.push({
        x: item.x, y: item.y, target,
        speed: item.kind === "rocket" ? 330 : 430,
        damage: item.damage, color: item.color,
        splash: item.kind === "rocket" ? 38 : 0,
      });
    }
  }

  findTarget(item) {
    let best = null, bestProgress = -1;
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
        wall.hp -= enemy.isBoss ? 2 : 1;
        if (wall.hp <= 0) this.built = this.built.filter((item) => item !== wall);
        continue;
      }
      const target = this.currentLayout.path[enemy.pathIndex];
      const tx = target[0] * TILE + TILE / 2;
      const ty = target[1] * TILE + TILE / 2;
      const dist = Math.hypot(tx - enemy.x, ty - enemy.y);
      const slow = time < enemy.slowUntil ? 0.48 : 1;
      const step = enemy.speed * slow * dt;
      if (dist <= step) {
        enemy.x = tx;
        enemy.y = ty;
        enemy.pathIndex += 1;
        if (enemy.pathIndex >= this.currentLayout.path.length) {
          this.enemies.splice(i, 1);
          this.leaks += 1;
          this.baseHp -= enemy.damage;
          this.hurtUntil = time + 220;
          if (this.baseHp <= 0) this.endMission(false);
        }
      } else {
        enemy.x += ((tx - enemy.x) / dist) * step;
        enemy.y += ((ty - enemy.y) / dist) * step;
      }
    }
  }

  findBlockingWall(enemy) {
    return this.built.find((item) => {
      if (item.kind !== "wall" || isBuilding(item, elapsed)) return false;
      return Phaser.Math.Distance.Between(item.x, item.y, enemy.x, enemy.y) < 42;
    });
  }

  updateProjectiles(dt, time) {
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
        this.hitEnemy(projectile.target, projectile.damage, projectile.splash, time);
        this.projectiles.splice(i, 1);
      } else {
        projectile.x += (dx / dist) * step;
        projectile.y += (dy / dist) * step;
      }
    }
  }

  hitEnemy(target, damage, splash, time) {
    const hurt = (enemy, amount) => {
      enemy.hp -= amount;
      enemy.flashUntil = time + 80;
    };
    hurt(target, damage);
    if (splash > 0) {
      for (const enemy of this.enemies) {
        if (enemy === target) continue;
        if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) <= splash) hurt(enemy, Math.round(damage * 0.38));
      }
    }
    const killed = this.enemies.filter((enemy) => enemy.hp <= 0);
    for (const enemy of killed) {
      this.money += enemy.reward;
      this.kills += 1;
      if (!reduced) {
        for (let n = 0; n < 6; n += 1) {
          this.crumbs.push({
            x: enemy.x, y: enemy.y,
            vx: (Math.random() - 0.5) * 90,
            vy: (Math.random() - 0.5) * 90,
            r: 3 + Math.random() * 3,
            color: enemy.color,
            life: 280,
            until: time + 280,
          });
        }
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.hp > 0);
  }

  checkWaveComplete() {
    if (this.ended || this.spawnsLeft !== -1 || this.enemies.length !== 0) return;
    this.money += 20 + this.wave * 4;
    this.spawnsLeft = 0;
    this.spawning = false;
    if (!this.endless && this.wave >= this.level.waves.length) {
      this.endMission(true);
      return;
    }
    this.wave += 1;
    this.enterPrepare();
  }

  endMission(won) {
    if (!this.running || this.ended) return;
    this.ended = true;
    this.running = false;
    this.spawning = false;
    this.won = won;
    ui.pauseButton.disabled = true;
    ui.waveButton.disabled = true;
    const played = this.kills + this.leaks > 0;
    if (won && !played) this.won = false;
    const stats = {
      won: this.won,
      played,
      leaks: this.leaks,
      baseHp: Math.max(0, this.baseHp),
      money: this.money,
      startMoney: this.startMoney,
      builtKinds: new Set(this.built.map((item) => item.kind)),
    };
    const results = evaluateObjectives(this.level, stats);
    const stars = this.won ? calculateStars(this.level, results, this.combatSec) : 0;
    if (this.won) persistWin(this.level.id, stars);
    if (!resultSent) {
      resultSent = true;
      result({ mode: `${selectedTheme}-${this.difficultyId}-${this.endless ? "endless" : "mission"}`, result: this.won ? "won" : "lost", wave: this.wave });
    }
    showDebrief(this, results, stars);
  }

  handlePointer(pointer) {
    if (!this.running || this.ended) return;
    const col = Math.floor(pointer.x / TILE);
    const row = Math.floor(pointer.y / TILE);
    if (!insideGrid(col, row)) return;
    if (selectedTool === "remove") { this.removeBuilt(col, row); return; }
    if (!isToolAllowed(this.level, selectedTool)) {
      ui.message.textContent = "This garden does not use that treat yet.";
      return;
    }
    const placement = this.placementAt(col, row);
    if (!placement.ok) { ui.message.textContent = placement.message; return; }
    const tool = currentTheme().tools[selectedTool];
    this.money -= tool.cost;
    this.built.push({
      ...tool,
      kind: selectedTool,
      col, row,
      x: col * TILE + TILE / 2,
      y: row * TILE + TILE / 2,
      readyAt: elapsed + buildTimeFor(tool),
      buildStartedAt: elapsed,
      buildReadyAt: elapsed + buildTimeFor(tool),
      hp: selectedTool === "wall" ? 8 : 1,
      remainingMs: selectedTool === "wall" ? tool.durationMs : 0,
      kickUntil: 0,
    });
    ui.message.textContent = `${tool.name} is being built. Start the wave when you are ready.`;
  }

  hoverTile(pointer) {
    this.hover = { col: Math.floor(pointer.x / TILE), row: Math.floor(pointer.y / TILE) };
  }

  placementAt(col, row) {
    const tool = currentTheme().tools[selectedTool];
    if (isRoadTile(col, row, this.currentLayout.path) && !tool.blocksPath) return { ok: false, message: currentTheme().blockedPlacementText };
    if (!isRoadTile(col, row, this.currentLayout.path) && tool.blocksPath) return { ok: false, message: currentTheme().wallPlacementText };
    if (this.built.some((item) => item.col === col && item.row === row)) return { ok: false, message: "That tile is already occupied." };
    if (this.money < tool.cost) return { ok: false, message: `${tool.name} needs ${tool.cost} jelly.` };
    return { ok: true, message: "" };
  }

  drawGhost() {
    if (!this.running || this.ended || selectedTool === "remove") return;
    const { col, row } = this.hover;
    if (!insideGrid(col, row)) return;
    const tool = currentTheme().tools[selectedTool];
    const x = col * TILE + TILE / 2, y = row * TILE + TILE / 2;
    const valid = this.placementAt(col, row).ok && isToolAllowed(this.level, selectedTool);
    if (!tool.blocksPath) {
      this.graphics.lineStyle(2, valid ? 0x7bc47f : 0xe35d86, 0.85);
      this.graphics.strokeCircle(x, y, tool.range);
    }
    this.graphics.fillStyle(tool.color, valid ? 0.22 : 0.08);
    this.graphics.fillCircle(x, y, tool.blocksPath ? 31 : 26);
  }

  removeBuilt(col, row) {
    const index = this.built.findIndex((item) => item.col === col && item.row === row);
    if (index === -1) { ui.message.textContent = "Nothing to remove on that tile."; return; }
    const [removed] = this.built.splice(index, 1);
    this.money += removed.refund;
    ui.message.textContent = `${removed.name} removed. Refunded ${removed.refund} jelly.`;
  }

  clearMission() {
    this.time.removeAllEvents();
    this.built = [];
    this.enemies = [];
    this.projectiles = [];
    this.crumbs = [];
    this.ended = false;
  }

  drawActors(time) {
    for (const item of this.built) drawTower(this.graphics, item, time, isBuilding(item, time));
    for (const enemy of this.enemies) drawEnemy(this.graphics, enemy, time);
    for (const projectile of this.projectiles) drawShot(this.graphics, projectile);
  }
}

function insideGrid(col, row) { return col >= 0 && col < COLS && row >= 0 && row < ROWS; }
function isRoadTile(col, row, route) {
  for (let i = 0; i < route.length - 1; i += 1) {
    const [ax, ay] = route[i], [bx, by] = route[i + 1];
    if (col >= Math.min(ax, bx) && col <= Math.max(ax, bx) && row >= Math.min(ay, by) && row <= Math.max(ay, by)) return true;
  }
  return false;
}
function buildTimeFor(tool) { return Math.round(450 + tool.cost * 18); }
function isBuilding(item, time) { return time < item.buildReadyAt; }
function currentTheme() { return themes[selectedTheme]; }
function currentLevel() { return LEVELS[selectedLevelId - 1]; }

function renderBriefing() {
  const level = currentLevel();
  const progress = loadProgress();
  ui.levelKicker.textContent = `Garden ${level.id} of ${LEVELS.length}`;
  ui.briefTitle.textContent = level.title;
  ui.briefBody.textContent = level.brief;
  ui.briefGoals.innerHTML = [...level.objectives.primary, ...level.objectives.bonus].map((o) => `<li>${o.label}</li>`).join("");
  ui.levelPicks.innerHTML = "";
  for (const item of LEVELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.title;
    button.disabled = item.id > progress.unlocked;
    button.classList.toggle("active", item.id === selectedLevelId);
    button.addEventListener("click", () => { selectedLevelId = item.id; selectedTool = "fighter"; applyThemeUi(); renderBriefing(); });
    ui.levelPicks.append(button);
  }
}

function showDebrief(scene, results, stars) {
  const level = scene.level;
  ui.debrief.classList.remove("hidden");
  ui.debriefKicker.textContent = scene.won ? "Garden saved" : "Garden lost";
  ui.debriefTitle.textContent = scene.won ? "The cake is safe." : "The cake was taken.";
  ui.debriefBody.textContent = scene.won
    ? `${stars} star${stars === 1 ? "" : "s"} in ${Math.round(scene.combatSec)}s.`
    : currentTheme().loseText;
  ui.debriefStars.textContent = scene.won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  const rows = [...level.objectives.primary, ...level.objectives.bonus];
  ui.debriefGoals.innerHTML = rows.map((o) => {
    const met = results.primary[o.id] || results.bonus[o.id];
    return `<li class="${met ? "met" : ""}">${met ? "Done" : "Missed"}: ${o.label}</li>`;
  }).join("");
  ui.debriefHint.textContent = scene.won
    ? (stars < 3 ? "Try a cleaner cake or a thriftier build for more stars." : "Every treat did its job.")
    : level.id === 2
      ? "Cupcakes help when the path is crowded."
      : level.id === 3
        ? "Slow the fast raiders before they reach the cake."
        : "Lollipops belong on the bends, not the far grass.";
  const progress = loadProgress();
  const hasNext = scene.won && selectedLevelId < LEVELS.length && progress.unlocked >= selectedLevelId + 1;
  ui.nextButton.disabled = !hasNext;
  ui.message.textContent = scene.won ? ui.debriefBody.textContent : currentTheme().loseText;
}

function updateUi(scene) {
  const total = scene.level.waves.length;
  ui.wave.textContent = scene.endless ? String(scene.wave) : `${scene.wave}/${total}`;
  ui.design.textContent = scene.currentLayout.name;
  ui.base.textContent = String(Math.max(0, scene.baseHp));
  ui.money.textContent = String(scene.money);
  if (!scene.currentBoss) ui.boss.textContent = "Standby";
  ui.goalLine.textContent = scene.level.brief;
  ui.app.dataset.phase = scene.ended ? "ended" : scene.running ? "play" : "idle";
  ui.app.dataset.layout = scene.currentLayout.name;
  ui.app.dataset.built = String(scene.built.length);
  ui.app.dataset.spawning = scene.spawning ? "1" : "0";
}

function applyThemeUi() {
  const theme = currentTheme();
  const level = currentLevel();
  ui.title.textContent = theme.title;
  ui.subtitle.textContent = theme.subtitle;
  ui.toolButtons.forEach((button) => {
    const toolId = button.dataset.tool;
    if (toolId === "remove") {
      button.innerHTML = `<span class="glyph bin" aria-hidden="true"></span>Remove<small>Refund half</small>`;
      button.disabled = false;
      button.classList.toggle("active", selectedTool === "remove");
      return;
    }
    const tool = theme.tools[toolId];
    const allowed = isToolAllowed(level, toolId);
    button.innerHTML = `<span class="glyph ${toolId === "fighter" ? "lolly" : toolId === "rocket" ? "cake" : toolId === "frost" ? "cone" : "cookie"}" aria-hidden="true"></span>${tool.name}<small>${tool.role} · ${tool.cost}</small>`;
    button.disabled = !allowed;
    button.hidden = false;
    button.classList.toggle("active", selectedTool === toolId);
  });
}

listen(ui.startButton, "click", () => sceneRef?.startMission());
listen(ui.waveButton, "click", () => sceneRef?.startWave());
listen(ui.nextButton, "click", () => {
  if (ui.nextButton.disabled) return;
  selectedLevelId = Math.min(LEVELS.length, selectedLevelId + 1);
  selectedTool = "fighter";
  applyThemeUi();
  renderBriefing();
  sceneRef?.startMission();
});
listen(ui.themeSelect, "change", () => {
  resume();
  ui.pauseButton.disabled = true;
  ui.waveButton.disabled = true;
  selectedTheme = ui.themeSelect.value;
  selectedTool = "fighter";
  applyThemeUi();
  if (!sceneRef) return;
  sceneRef.clearMission();
  sceneRef.running = false;
  sceneRef.won = false;
  sceneRef.wave = 1;
  sceneRef.baseHp = currentLevel().base;
  sceneRef.money = currentLevel().budget;
  renderBriefing();
  updateUi(sceneRef);
});
ui.toolButtons.forEach((button) => {
  listen(button, "click", () => {
    if (button.disabled) return;
    selectedTool = button.dataset.tool;
    ui.toolButtons.forEach((item) => item.classList.toggle("active", item === button));
  });
});

let disposeRuntime = () => {};
const canvasHost = container.querySelector("#game");
canvasHost.tabIndex = 0;
try {
new SessionGame({
  autoFocus: false,
  audio: { noAudio: true },
  input: { windowEvents: false, keyboard: false, mouse: { target: canvasHost }, touch: { target: canvasHost } },
  callbacks: { preBoot(game) { disposeRuntime = ownRuntime(game); if (disposed) disposeRuntime(); } },
  type: Phaser.AUTO,
  width: WIDTH,
  height: HEIGHT,
  parent: canvasHost,
  backgroundColor: "#dff3c8",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BaseDefenseScene],
});
} catch (error) {
  disposed = true;
  listeners.abort();
  try { disposeRuntime(true); } catch (cleanupError) { console.error(cleanupError); }
  throw error;
}

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
