import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "warnings.json");

export interface Warning {
  reason: string;
  moderatorId: string;
  timestamp: string;
}

type WarningData = Record<string, Record<string, Warning[]>>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): WarningData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: WarningData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function addWarning(guildId: string, userId: string, warning: Warning): void {
  const data = loadData();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = [];
  data[guildId][userId].push(warning);
  saveData(data);
}

export function getWarnings(guildId: string, userId: string): Warning[] {
  const data = loadData();
  return data[guildId]?.[userId] ?? [];
}

export function clearWarnings(guildId: string, userId: string): void {
  const data = loadData();
  if (data[guildId]) delete data[guildId][userId];
  saveData(data);
}
