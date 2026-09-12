/**
 * Campaign levels adapted from Server Survival src/campaign/levels.js
 * at 01796362d3b7bfa6c85efab5e2685f4d955dc137 (MIT).
 * Service/traffic fields are not used; budget, allowed tools, objectives,
 * failConditions and star math are mapped onto this candy garden.
 */
const STORAGE_KEY = "pma-defense-arcade-stars";

export const LAYOUTS = {
  switchback: {
    name: "Switchback",
    path: [[0, 4], [2, 4], [2, 2], [4, 2], [4, 6], [7, 6], [7, 3], [9, 3], [9, 5], [11, 5]],
  },
  longMarch: {
    name: "Long March",
    path: [[0, 3], [2, 3], [2, 6], [5, 6], [5, 3], [7, 3], [7, 1], [10, 1], [10, 5], [11, 5]],
  },
  northGate: {
    name: "North Gate",
    path: [[0, 2], [3, 2], [3, 5], [5, 5], [5, 1], [8, 1], [8, 4], [11, 4]],
  },
};

export const LEVELS = [
  {
    id: 1,
    title: "Perimeter",
    brief: "Pulse turrets hit one drone at a time. Cover the bends.",
    layout: LAYOUTS.switchback,
    budget: 160,
    base: 8,
    durationSec: 90,
    allowedTools: ["fighter", "wall", "remove"],
    waves: [
      { count: 5, pack: "scout" },
      { count: 6, pack: "scout" },
      { count: 7, pack: "scout" },
    ],
    boss: { label: "Heavy carrier", kind: "boss", color: 0xff8fc7, hp: 1.35, speed: 0.82, reward: 40, damage: 2 },
    incoming: "Heavy carrier",
    objectives: {
      primary: [{ id: "defend", label: "Protect the core" }],
      bonus: [
        { id: "whole", label: "No breaches" },
        { id: "thrifty", label: "Spend 120 credits or less" },
      ],
    },
    failConditions: { coreGone: true },
  },
  {
    id: 2,
    title: "Crowd control",
    brief: "Mortars hit clusters. Cover a long stretch of the route.",
    layout: LAYOUTS.longMarch,
    budget: 220,
    base: 8,
    durationSec: 100,
    allowedTools: ["fighter", "rocket", "wall", "remove"],
    waves: [
      { count: 9, pack: "swarm" },
      { count: 11, pack: "swarm" },
      { count: 13, pack: "swarm" },
    ],
    boss: { label: "Siege carrier", kind: "boss", color: 0x55c8ff, hp: 1.4, speed: 0.9, reward: 44, damage: 2 },
    incoming: "Siege carrier",
    objectives: {
      primary: [{ id: "defend", label: "Protect the core" }],
      bonus: [
        { id: "healthy", label: "Keep at least 5 integrity" },
        { id: "splash", label: "Land 8 splash hits" },
      ],
    },
    failConditions: { coreGone: true },
  },
  {
    id: 3,
    title: "Fast response",
    brief: "Interceptors move fast. Slow them inside your turret coverage.",
    layout: LAYOUTS.northGate,
    budget: 200,
    base: 8,
    durationSec: 110,
    allowedTools: ["fighter", "frost", "wall", "remove"],
    waves: [
      { count: 7, pack: "fast" },
      { count: 8, pack: "fast" },
      { count: 9, pack: "fast" },
    ],
    boss: { label: "Strike carrier", kind: "boss", color: 0xe3a44f, hp: 1.45, speed: 0.92, reward: 48, damage: 2 },
    incoming: "Strike carrier",
    objectives: {
      primary: [{ id: "defend", label: "Protect the core" }],
      bonus: [
        { id: "whole", label: "No breaches" },
        { id: "chill", label: "Destroy 5 slowed drones" },
      ],
    },
    failConditions: { coreGone: true },
  },
  {
    id: 4,
    title: "Relay siege",
    brief: "Read the next wave. Combine pulse, mortar and stasis to hold the relay.",
    layout: { name: "Relay sector", path: [[0, 2], [3, 2], [3, 5], [7, 5], [7, 2], [10, 2], [10, 6], [11, 6]] },
    budget: 240,
    base: 12,
    durationSec: 300,
    open: true,
    allowedTools: ["fighter", "rocket", "frost", "wall", "remove"],
    waves: [
      { title: "Probe", income: 75, hint: "Cover both bends with pulse turrets.", groups: [{ pack: "scout", count: 14, at: 0, gap: 1100 }], boss: false },
      { title: "Swarm front", income: 50, hint: "A dense cluster is coming. Mortars reward shared coverage.", groups: [{ pack: "swarm", count: 72, at: 0, gap: 100 }, { pack: "scout", count: 10, at: 10000, gap: 850 }], boss: false },
      { title: "Fast flank", income: 60, hint: "Fast interceptors arrive at 12s. Slow them near your pulse turrets.", groups: [{ pack: "scout", count: 12, at: 0, gap: 850 }, { pack: "fast", count: 18, at: 12000, gap: 500 }], boss: false },
      { title: "Crossfire", income: 75, hint: "Swarm first, interceptors at 10s. Keep both responses funded.", groups: [{ pack: "swarm", count: 80, at: 0, gap: 95 }, { pack: "fast", count: 22, at: 10000, gap: 440 }], boss: false },
      { title: "Relay siege", income: 0, hint: "A carrier follows the swarm. Keep the exit covered for fast escorts.", groups: [{ pack: "swarm", count: 96, at: 0, gap: 90 }, { pack: "fast", count: 28, at: 12000, gap: 420 }], boss: true },
    ],
    boss: { label: "Command carrier", kind: "boss", color: 0xff8768, hp: 4.2, speed: 0.9, reward: 40, damage: 4 },
    incoming: "Command carrier",
    objectives: { primary: [{ id: "defend", label: "Hold all five waves" }], bonus: [{ id: "healthy", label: "Keep at least 5 integrity" }, { id: "combined", label: "20 splash hits and 10 slowed takedowns" }] },
    failConditions: { coreGone: true },
  },
];

// One deterministic timeline feeds both the live wave and the forecast.
export function waveSchedule(wave, countMultiplier = 1) {
  const groups = wave.groups || [{ pack: wave.pack, count: wave.count, at: 0, gap: 700 }];
  return groups.flatMap(group => Array.from({ length: Math.max(1, Math.round(group.count * countMultiplier)) }, (_, i) => ({ pack: group.pack, at: group.at + i * group.gap }))).sort((a, b) => a.at - b.at);
}

export function isToolAllowed(level, tool) {
  if (!level?.allowedTools?.length) return true;
  return level.allowedTools.includes(tool);
}

export function evaluateObjectives(level, stats) {
  const primary = {};
  const bonus = {};
  for (const o of level.objectives.primary) primary[o.id] = checkObjective(o.id, stats);
  for (const o of level.objectives.bonus) bonus[o.id] = checkObjective(o.id, stats);
  return { primary, bonus };
}

function checkObjective(id, stats) {
  if (id === "defend") return stats.won && stats.played;
  if (id === "whole") return stats.won && stats.leaks === 0;
  if (id === "thrifty") return stats.won && stats.spent <= 120;
  if (id === "healthy") return stats.won && stats.baseHp >= 5;
  if (id === "splash") return stats.won && stats.splashHits >= 8;
  if (id === "chill") return stats.won && stats.slowKills >= 5;
  if (id === "combined") return stats.won && stats.splashHits >= 20 && stats.slowKills >= 10;
  return false;
}

/** Star math from Server Survival campaign.js _calculateStars at the pinned commit. */
export function calculateStars(level, results, combatSec) {
  if (!level.objectives.primary.every((o) => results.primary[o.id])) return 0;
  let stars = 1;
  const bonuses = level.objectives.bonus || [];
  const met = bonuses.filter((o) => results.bonus[o.id]).length;
  if (met > 0) stars += 1;
  const fast = combatSec <= level.durationSec * 0.8;
  const flawless = bonuses.length >= 2 && met === bonuses.length;
  if (fast || flawless) stars += 1;
  return Math.min(3, stars);
}

export function loadProgress() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!raw || typeof raw !== "object") return { unlocked: 1, completed: {} };
    const unlocked = Number.isInteger(raw.unlocked) && raw.unlocked >= 1 ? Math.min(LEVELS.length, raw.unlocked) : 1;
    const completed = raw.completed && typeof raw.completed === "object" ? raw.completed : {};
    return { unlocked, completed };
  } catch {
    return { unlocked: 1, completed: {} };
  }
}

export function persistWin(levelId, stars) {
  const progress = loadProgress();
  const prev = progress.completed[levelId] || { stars: 0 };
  progress.completed[levelId] = { stars: Math.max(prev.stars || 0, stars) };
  if (stars > 0) progress.unlocked = Math.max(progress.unlocked, Math.min(LEVELS.length, levelId + 1));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* blocked storage still lets you play */ }
  return progress;
}
