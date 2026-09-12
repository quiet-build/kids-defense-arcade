import Phaser from "phaser";
import markup from './ui.html?raw';
import { ownRuntime, SessionGame } from './runtime';
import { LEVELS, waveSchedule, calculateStars, evaluateObjectives, isToolAllowed, loadProgress, persistWin } from './levels';
import { paintGarden, drawTower, drawEnemy, drawShot, drawCrumbs } from './art';

const TILE = 80, COLS = 12, ROWS = 8, WIDTH = COLS * TILE, HEIGHT = ROWS * TILE;
const PACKS = {
  scout: { kind: "scout", label: "Scout", color: 0xffb66e, hp: 36, speed: 48, reward: 11, damage: 1, radius: 16 },
  swarm: { kind: "swarm", label: "Swarm drone", color: 0xffca70, hp: 20, speed: 64, reward: 7, damage: 1, radius: 13 },
  fast: { kind: "fast", label: "Interceptor", color: 0xff748c, hp: 32, speed: 80, reward: 13, damage: 1, radius: 15 },
};
const difficulties = {
  rookie: { hp: 0.82, speed: 0.86, count: 0.88, reward: 1.15, hearts: 2 },
  normal: { hp: 1, speed: 1, count: 1, reward: 1, hearts: 0 },
  veteran: { hp: 1.22, speed: 1.12, count: 1.1, reward: 0.9, hearts: -2 },
};
const defense = {
  title: "Relay Defense",
  subtitle: "Build a line. Read the pressure. Hold the core.",
  startText: "Place a turret beside the route, then start the wave.",
  loseText: "The relay fell. Adjust your coverage and try again.",
  blockedPlacementText: "Turrets need a platform beside the route.",
  wallPlacementText: "Barriers belong on the route.",
  tools: {
    fighter: { name: "Pulse turret", role: "Fast single", cost: 40, refund: 20, range: 145, damage: 12, cooldown: 550, color: 0x6ee7c2, blocksPath: false },
    rocket: { name: "Mortar", role: "Area damage", cost: 75, refund: 38, range: 175, damage: 27, cooldown: 1020, color: 0xffc268, blocksPath: false },
    frost: { name: "Stasis field", role: "Slow targets", cost: 60, refund: 30, range: 118, damage: 5, cooldown: 850, slowMs: 1800, color: 0x79bbff, blocksPath: false },
    wall: { name: "Barrier", role: "Brief block", cost: 35, refund: 18, durationMs: 6500, color: 0xb8c6d9, blocksPath: true },
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
let selectedLevelId = 1;
let sceneRef = null;
let resultSent = false;
const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

const ui = {
  app: container.querySelector(".app"),
  title: container.querySelector("#gameTitle"),
  subtitle: container.querySelector("#gameSubtitle"),
  difficulty: container.querySelector("#difficulty"),
  endlessMode: container.querySelector("#endlessMode"),
  pauseButton: container.querySelector("#pauseButton"),
  startButton: container.querySelector("#startButton"),
  deployButton: container.querySelector("#deployButton"),
  closeBriefing: container.querySelector("#closeBriefing"),
  waveButton: container.querySelector("#waveButton"),
  nextButton: container.querySelector("#nextButton"),
  wave: container.querySelector("#waveText"),
  design: container.querySelector("#designText"),
  base: container.querySelector("#baseText"),
  money: container.querySelector("#moneyText"),
  boss: container.querySelector("#bossText"),
  forecast: container.querySelector("#forecast"),
  pressure: container.querySelector("#pressure"),
  sectorButton: container.querySelector("#sectorButton"),
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
    this.mapGraphics = this.add.graphics();
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
    this.paintMap();
    this.baseHp = this.level.base;
    this.startHp = this.level.base;
    this.money = this.level.budget;
    this.spawnsLeft = 0;
    this.currentBoss = this.level.boss;
    this.difficulty = difficulties.normal;
    this.endless = false;
    this.won = false;
    this.spawning = false;
    this.hover = { col: -1, row: -1 };
    this.leaks = 0;
    this.kills = 0;
    this.combatSec = 0;
    this.spent = 0;
    this.splashHits = 0;
    this.slowKills = 0;
    this.leakTypes = {};
    this.hurtUntil = 0;
    this.input.on("pointerdown", (pointer) => this.handlePointer(pointer));
    this.input.on("pointermove", (pointer) => this.hoverTile(pointer));
    this.input.on("pointerout", () => { this.hover = { col: -1, row: -1 }; });
    applyThemeUi();
    renderBriefing();
    updateUi(this);
    ui.startButton.disabled = false;
    ui.deployButton.disabled = false;
    if (!disposed) ready();
  }

  paintMap() {
    this.mapGraphics.clear();
    paintGarden(this.mapGraphics, { cols: COLS, rows: ROWS, tile: TILE, path: this.currentLayout.path, reduced });
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
    this.endless = ui.endlessMode.checked;
    this.difficultyId = ui.difficulty.value;
    this.difficulty = difficulties[this.difficultyId];
    this.level = LEVELS[selectedLevelId - 1];
    this.currentLayout = this.level.layout;
    this.paintMap();
    this.startHp = Math.max(4, this.level.base + this.difficulty.hearts);
    this.baseHp = this.startHp;
    this.money = this.level.budget;
    this.currentBoss = this.level.boss;
    this.leaks = 0;
    this.kills = 0;
    this.combatSec = 0;
    this.spent = 0;
    this.splashHits = 0;
    this.slowKills = 0;
    this.leakTypes = {};
    applyThemeUi();
    ui.pauseButton.disabled = false;
    ui.debrief.classList.add("hidden");
    ui.message.textContent = defense.startText;
    this.enterPrepare();
    canvasHost.focus({ preventScroll: true });
  }

  enterPrepare() {
    this.spawning = false;
    this.spawnsLeft = 0;
    this.enemies = [];
    this.projectiles = [];
    ui.waveButton.disabled = false;
    ui.boss.textContent = this.level.incoming;
    const total = this.level.waves.length;
    ui.message.textContent = `Wave ${this.wave} of ${total}. Place towers, then start the wave. Arrow keys select a tile; Enter builds.`;
    renderForecast(this);
    updateUi(this);
  }

  startWave() {
    if (!this.running || this.spawning || this.ended) return;
    this.spawning = true;
    const wave = this.level.waves[(this.wave - 1) % this.level.waves.length];
    this.schedule = waveSchedule(wave, this.difficulty.count);
    this.spawnIndex = 0;
    this.spawnsLeft = this.schedule.length;
    this.waveStartedAt = elapsed;
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
    if (this.running && !this.ended) {
      if (this.spawning) {
        this.combatSec += delta / 1000;
        this.updateSpawns(time);
      }
      this.updateBuilt(time, delta);
      this.moveEnemies(delta / 1000, time);
      if (this.ended) { this.drawActors(time); updateUi(this); return; }
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
    while (this.spawnIndex < this.schedule.length && time - this.waveStartedAt >= this.schedule[this.spawnIndex].at + 280) {
      this.spawnEnemy(false, this.schedule[this.spawnIndex].pack);
      this.spawnIndex += 1;
      this.spawnsLeft -= 1;
    }
    if (this.spawnsLeft === 0) {
      const wave = this.level.waves[(this.wave - 1) % this.level.waves.length];
      if (wave.boss !== false) this.spawnEnemy(true);
      this.spawnsLeft = -1;
    }
  }

  spawnEnemy(isBoss, pack) {
    const base = isBoss
      ? { ...this.level.boss, hp: (120 + this.wave * 28) * this.level.boss.hp, speed: 30 * this.level.boss.speed, radius: 26 }
      : PACKS[pack];
    const hp = base.hp * this.difficulty.hp;
    this.enemies.push({
      ...base,
      x: this.currentLayout.path[0][0] * TILE + TILE / 2,
      y: this.currentLayout.path[0][1] * TILE + TILE / 2,
      pathIndex: 1,
      hp,
      maxHp: hp,
      speed: base.speed * this.difficulty.speed,
      reward: this.level.id === 4 ? 0 : Math.round(base.reward * this.difficulty.reward),
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
      item.aimX = target.x;
      item.aimY = target.y;
      this.projectiles.push({
        x: item.x, y: item.y, target,
        speed: item.kind === "rocket" ? 330 : 430,
        damage: item.damage, color: item.color,
        splash: item.kind === "rocket" ? 72 : 0,
        slowMs: item.kind === "frost" ? item.slowMs : 0,
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
          this.leakTypes[enemy.label] = (this.leakTypes[enemy.label] || 0) + 1;
          this.baseHp -= enemy.damage;
          this.hurtUntil = time + 220;
          if (this.baseHp <= 0) { this.endMission(false); return; }
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
        this.hitEnemy(projectile.target, projectile.damage, projectile.splash, time, projectile.slowMs);
        this.projectiles.splice(i, 1);
      } else {
        projectile.x += (dx / dist) * step;
        projectile.y += (dy / dist) * step;
      }
    }
  }

  hitEnemy(target, damage, splash, time, slowMs) {
    if (slowMs) target.slowUntil = Math.max(target.slowUntil, time + slowMs);
    const hurt = (enemy, amount) => {
      enemy.hp -= amount;
      enemy.flashUntil = time + 80;
    };
    hurt(target, damage);
    if (splash > 0) {
      for (const enemy of this.enemies) {
        if (enemy === target) continue;
        if (Phaser.Math.Distance.Between(target.x, target.y, enemy.x, enemy.y) <= splash) {
          hurt(enemy, Math.round(damage * 0.7));
          this.splashHits += 1;
        }
      }
    }
    const killed = this.enemies.filter((enemy) => enemy.hp <= 0);
    for (const enemy of killed) {
      this.money += enemy.reward;
      this.kills += 1;
      if (enemy.slowUntil > time) this.slowKills += 1;
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
    const wave = this.level.waves[(this.wave - 1) % this.level.waves.length];
    this.money += wave.income ?? (20 + this.wave * 4);
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
      spent: this.spent,
      splashHits: this.splashHits,
      slowKills: this.slowKills,
    };
    const results = evaluateObjectives(this.level, stats);
    const stars = this.won ? calculateStars(this.level, results, this.combatSec) : 0;
    if (this.won) persistWin(this.level.id, stars);
    if (!resultSent) {
      resultSent = true;
      result({ mode: `relay-${this.difficultyId}-${this.endless ? "endless" : "mission"}`, result: this.won ? "won" : "lost", wave: this.wave });
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
      ui.message.textContent = "This sector has not unlocked that tool.";
      return;
    }
    const placement = this.placementAt(col, row);
    if (!placement.ok) { ui.message.textContent = placement.message; return; }
    const tool = defense.tools[selectedTool];
    this.money -= tool.cost;
    this.spent += tool.cost;
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
    const tool = defense.tools[selectedTool];
    if (isRoadTile(col, row, this.currentLayout.path) && !tool.blocksPath) return { ok: false, message: defense.blockedPlacementText };
    if (!isRoadTile(col, row, this.currentLayout.path) && tool.blocksPath) return { ok: false, message: defense.wallPlacementText };
    if (this.built.some((item) => item.col === col && item.row === row)) return { ok: false, message: "That tile is already occupied." };
    if (this.money < tool.cost) return { ok: false, message: `${tool.name} needs ${tool.cost} credits.` };
    return { ok: true, message: "" };
  }

  drawGhost() {
    if (!this.running || this.ended || selectedTool === "remove") return;
    const { col, row } = this.hover;
    if (!insideGrid(col, row)) return;
    const tool = defense.tools[selectedTool];
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
    ui.message.textContent = `${removed.name} removed. Refunded ${removed.refund} credits.`;
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
function currentLevel() { return LEVELS[selectedLevelId - 1]; }

function renderBriefing() {
  const level = currentLevel();
  const progress = loadProgress();
  ui.levelKicker.textContent = level.id === 4 ? "Survival challenge · 4–6 min" : `Training ${level.id} of 3`;
  ui.briefTitle.textContent = level.title;
  ui.briefBody.textContent = level.brief;
  ui.briefGoals.innerHTML = [...level.objectives.primary, ...level.objectives.bonus].map((o) => `<li>${o.label}</li>`).join("");
  renderForecast(sceneRef);
  ui.levelPicks.innerHTML = "";
  for (const item of LEVELS) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = item.title;
    button.disabled = !item.open && item.id > progress.unlocked;
    button.setAttribute("aria-pressed", String(item.id === selectedLevelId));
    button.classList.toggle("active", item.id === selectedLevelId);
    button.addEventListener("click", () => {
      selectedLevelId = item.id; selectedTool = "fighter";
      sceneRef.level = item; sceneRef.currentLayout = item.layout; sceneRef.paintMap();
      sceneRef.baseHp = item.base; sceneRef.money = item.budget;
      applyThemeUi(); renderBriefing(); updateUi(sceneRef);
    });
    ui.levelPicks.append(button);
  }
}

function showDebrief(scene, results, stars) {
  const level = scene.level;
  ui.debrief.classList.remove("hidden");
  ui.debriefKicker.textContent = scene.won ? "Sector secured" : "Signal lost";
  ui.debriefTitle.textContent = scene.won ? "Relay secured." : "Core breached.";
  ui.debriefBody.textContent = scene.won
    ? `${stars} star${stars === 1 ? "" : "s"} in ${Math.round(scene.combatSec)}s.`
    : `Wave ${scene.wave}: ${scene.leaks} breaches. ${Object.entries(scene.leakTypes).map(([name, count]) => `${count} ${name}`).join(", ")}.`;
  ui.debriefStars.textContent = scene.won ? "★".repeat(stars) + "☆".repeat(3 - stars) : "☆☆☆";
  const rows = [...level.objectives.primary, ...level.objectives.bonus];
  ui.debriefGoals.innerHTML = rows.map((o) => {
    const met = results.primary[o.id] || results.bonus[o.id];
    return `<li class="${met ? "met" : ""}">${met ? "Done" : "Missed"}: ${o.label}</li>`;
  }).join("");
  ui.debriefHint.textContent = `${scene.splashHits} splash hits · ${scene.slowKills} slowed takedowns · ${scene.spent} credits invested. ${scene.leakTypes.Interceptor ? "Place stasis beside pulse coverage to catch interceptors." : scene.leakTypes["Swarm drone"] ? "Mortars cover dense swarms; add one at a shared bend." : scene.won ? (scene.leaks ? "Try another placement for fewer breaches." : "Clean defense. Try Veteran for faster, tougher enemies.") : "Cover more of the route before buying extra firepower."}`;
  const progress = loadProgress();
  const hasNext = scene.won && selectedLevelId < LEVELS.length && progress.unlocked >= selectedLevelId + 1;
  ui.nextButton.disabled = !hasNext;
  ui.message.textContent = scene.won ? ui.debriefBody.textContent : defense.loseText;
}

function renderForecast(scene) {
  const wave = scene.level.waves[(scene.wave - 1) % scene.level.waves.length];
  const schedule = waveSchedule(wave, scene.difficulty.count);
  const counts = {};
  for (const entry of schedule) counts[entry.pack] = (counts[entry.pack] || 0) + 1;
  ui.forecast.textContent = `${wave.title || `Wave ${scene.wave}`} — ${Object.entries(counts).map(([pack, n]) => `${n} ${PACKS[pack].label.toLowerCase()}${n === 1 ? "" : "s"}`).join(" + ")}${wave.boss !== false ? " + carrier" : ""}. ${wave.hint || scene.level.brief}${wave.income !== undefined ? ` Supply after wave: ${wave.income} credits. No kill income.` : ""}`;
}

function updateUi(scene) {
  const total = scene.level.waves.length;
  ui.wave.textContent = scene.endless ? String(scene.wave) : `${scene.wave}/${total}`;
  ui.design.textContent = scene.currentLayout.name;
  ui.base.textContent = String(Math.max(0, scene.baseHp));
  ui.money.textContent = String(scene.money);
  if (!scene.currentBoss) ui.boss.textContent = "Standby";
  ui.goalLine.textContent = `${scene.level.title} · ${scene.level.brief}`;
  const next = scene.spawning && scene.schedule?.[scene.spawnIndex];
  ui.pressure.textContent = scene.ended ? "Operation complete" : !scene.running ? "Choose a sector to deploy" : next ? `${scene.spawnsLeft} inbound · next ${PACKS[next.pack].label.toLowerCase()} in ${Math.max(0, Math.ceil((scene.waveStartedAt + next.at + 280 - elapsed) / 1000))}s` : scene.spawning ? `${scene.enemies.length} hostiles remaining` : "Preparation · no time limit";
  ui.startButton.textContent = scene.ended ? "Retry Mission" : scene.running ? "Restart Mission" : "Start Mission";
  ui.app.dataset.phase = scene.ended ? "ended" : scene.running ? "play" : "idle";
  ui.app.dataset.layout = scene.currentLayout.name;
  ui.app.dataset.built = String(scene.built.length);
  ui.app.dataset.enemies = String(scene.enemies.length);
  ui.app.dataset.spawning = scene.spawning ? "1" : "0";
}

function applyThemeUi() {
  const theme = defense;
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
    button.innerHTML = `<span class="glyph ${toolId}" aria-hidden="true"></span>${tool.name}<small>${tool.role} · ${tool.cost}</small>`;
    button.disabled = !allowed;
    button.hidden = false;
    button.classList.toggle("active", selectedTool === toolId);
  });
}

listen(ui.startButton, "click", () => sceneRef?.startMission());
listen(ui.deployButton, "click", () => sceneRef?.startMission());
listen(ui.closeBriefing, "click", () => {
  ui.briefing.classList.add("hidden");
  ui.startButton.focus();
});
listen(ui.sectorButton, "click", () => {
  if (!sceneRef) return;
  ui.briefing.classList.remove("hidden");
  resume();
  sceneRef.clearMission(); sceneRef.running = false; sceneRef.spawning = false;
  sceneRef.wave = 1; sceneRef.baseHp = currentLevel().base; sceneRef.money = currentLevel().budget;
  ui.pauseButton.disabled = true; ui.waveButton.disabled = true;
  ui.debrief.classList.add("hidden");
  renderBriefing(); updateUi(sceneRef);
});
listen(ui.waveButton, "click", () => sceneRef?.startWave());
listen(ui.difficulty, "change", () => {
  if (sceneRef && !sceneRef.running) { sceneRef.difficulty = difficulties[ui.difficulty.value]; renderForecast(sceneRef); }
});
listen(ui.nextButton, "click", () => {
  if (ui.nextButton.disabled) return;
  selectedLevelId = Math.min(LEVELS.length, selectedLevelId + 1);
  selectedTool = "fighter";
  applyThemeUi();
  renderBriefing();
  sceneRef?.startMission();
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
  backgroundColor: "#111e30",
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
listen(canvasHost, 'keydown', event => {
  if (!sceneRef?.running || sceneRef.ended || paused) return;
  const directions = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  if (!directions[event.key] && event.key !== 'Enter') return;
  event.preventDefault();
  const col = Math.max(0, sceneRef.hover.col), row = Math.max(0, sceneRef.hover.row);
  if (event.key === 'Enter') sceneRef.handlePointer({ x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 });
  else {
    const [dx, dy] = directions[event.key];
    sceneRef.hover = { col: Math.max(0, Math.min(COLS - 1, col + dx)), row: Math.max(0, Math.min(ROWS - 1, row + dy)) };
    ui.message.textContent = `Tile ${sceneRef.hover.col + 1}, ${sceneRef.hover.row + 1}. Enter to ${selectedTool === 'remove' ? 'remove' : 'build'}.`;
  }
});
listen(window, 'blur', pause);
listen(document, 'visibilitychange', () => { if (document.hidden) pause(); });
return { pause, dispose() { if (disposed) return; disposed = true; listeners.abort(); disposeRuntime(); } };
}
