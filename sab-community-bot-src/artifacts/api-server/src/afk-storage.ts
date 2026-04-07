import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "afk.json");

export interface AfkEntry {
  userId: string;
  guildId: string;
  message: string;
  setAt: string;
}

interface AfkData {
  [guildId: string]: {
    [userId: string]: AfkEntry;
  };
}

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): AfkData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: AfkData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function setAfk(guildId: string, userId: string, message: string): void {
  const data = loadData();
  if (!data[guildId]) data[guildId] = {};
  data[guildId][userId] = { userId, guildId, message, setAt: new Date().toISOString() };
  saveData(data);
}

export function removeAfk(guildId: string, userId: string): AfkEntry | null {
  const data = loadData();
  const entry = data[guildId]?.[userId] ?? null;
  if (entry) {
    delete data[guildId][userId];
    saveData(data);
  }
  return entry;
}

export function getAfk(guildId: string, userId: string): AfkEntry | null {
  return loadData()[guildId]?.[userId] ?? null;
}

export function getAllAfk(guildId: string): AfkEntry[] {
  return Object.values(loadData()[guildId] ?? {});
}
