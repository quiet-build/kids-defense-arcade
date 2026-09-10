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
    title: "Corner Garden",
    brief: "Lollipops hit one monster at a time. Cover the bends.",
    layout: LAYOUTS.switchback,
    budget: 160,
    base: 8,
    durationSec: 90,
    allowedTools: ["fighter", "wall", "remove"],
    waves: [
      { count: 5, pack: "gumdrop" },
      { count: 6, pack: "gumdrop" },
      { count: 7, pack: "gumdrop" },
    ],
    boss: { label: "Marshmallow Giant", kind: "boss", color: 0xff8fc7, hp: 1.35, speed: 0.82, reward: 40, damage: 2 },
    incoming: "Marshmallow Giant",
    objectives: {
      primary: [{ id: "defend", label: "Keep the cake" }],
      bonus: [
        { id: "whole", label: "Cake unbitten" },
        { id: "thrifty", label: "Spend 120 jelly or less" },
      ],
    },
    failConditions: { cakeGone: true },
  },
  {
    id: 2,
    title: "Cookie Path",
    brief: "Cupcakes splash. Use them when the path fills up.",
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
    boss: { label: "Jelly King", kind: "boss", color: 0x55c8ff, hp: 1.4, speed: 0.9, reward: 44, damage: 2 },
    incoming: "Jelly King",
    objectives: {
      primary: [{ id: "defend", label: "Keep the cake" }],
      bonus: [
        { id: "healthy", label: "Cake at 5 hearts or more" },
        { id: "splash", label: "Build a cupcake cannon" },
      ],
    },
    failConditions: { cakeGone: true },
  },
  {
    id: 3,
    title: "Ice Cream Slope",
    brief: "Fast raiders slip past. Slow them, then pop them.",
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
    boss: { label: "Cookie Queen", kind: "boss", color: 0xe3a44f, hp: 1.45, speed: 0.92, reward: 48, damage: 2 },
    incoming: "Cookie Queen",
    objectives: {
      primary: [{ id: "defend", label: "Keep the cake" }],
      bonus: [
        { id: "whole", label: "Cake unbitten" },
        { id: "chill", label: "Build a snow cone" },
      ],
    },
    failConditions: { cakeGone: true },
  },
];

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
  if (id === "thrifty") return stats.won && stats.startMoney - stats.money <= 120;
  if (id === "healthy") return stats.won && stats.baseHp >= 5;
  if (id === "splash") return stats.won && stats.builtKinds.has("rocket");
  if (id === "chill") return stats.won && stats.builtKinds.has("frost");
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
    const unlocked = Number.isInteger(raw.unlocked) && raw.unlocked >= 1 ? Math.min(3, raw.unlocked) : 1;
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
  if (stars > 0) progress.unlocked = Math.max(progress.unlocked, Math.min(3, levelId + 1));
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); } catch { /* blocked storage still lets you play */ }
  return progress;
}
