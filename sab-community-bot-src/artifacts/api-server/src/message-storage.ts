import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "messages.json");

type MessageData = Record<string, Record<string, number>>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): MessageData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: MessageData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function incrementMessage(guildId: string, userId: string): void {
  const data = loadData();
  if (!data[guildId]) data[guildId] = {};
  data[guildId][userId] = (data[guildId][userId] ?? 0) + 1;
  saveData(data);
}

export function getMessageCount(guildId: string, userId: string): number {
  const data = loadData();
  return data[guildId]?.[userId] ?? 0;
}

export function getMessageLeaderboard(guildId: string, limit = 10): { userId: string; count: number }[] {
  const data = loadData();
  const guild = data[guildId] ?? {};
  return Object.entries(guild)
    .map(([userId, count]) => ({ userId, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function resetMessages(guildId: string, userId?: string): void {
  const data = loadData();
  if (!data[guildId]) return;
  if (userId) delete data[guildId][userId];
  else data[guildId] = {};
  saveData(data);
}
