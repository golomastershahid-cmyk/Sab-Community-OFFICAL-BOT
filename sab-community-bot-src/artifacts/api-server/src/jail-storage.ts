import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "jail.json");

export interface JailRecord {
  userId: string;
  guildId: string;
  savedRoles: string[];
  jailedAt: string;
  expiresAt: string | null;
  reason: string;
  moderatorId: string;
}

type JailData = Record<string, Record<string, JailRecord>>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): JailData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: JailData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function saveJail(record: JailRecord): void {
  const data = loadData();
  if (!data[record.guildId]) data[record.guildId] = {};
  data[record.guildId][record.userId] = record;
  saveData(data);
}

export function getJail(guildId: string, userId: string): JailRecord | null {
  return loadData()[guildId]?.[userId] ?? null;
}

export function removeJail(guildId: string, userId: string): JailRecord | null {
  const data = loadData();
  const record = data[guildId]?.[userId] ?? null;
  if (record) {
    delete data[guildId][userId];
    saveData(data);
  }
  return record;
}

export function getAllJails(guildId: string): JailRecord[] {
  return Object.values(loadData()[guildId] ?? {});
}
