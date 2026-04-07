import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "invites.json");

export interface InviteRecord {
  inviterId: string;
  uses: number;
  left: number;
  fake: number;
}

type InviteData = Record<string, Record<string, InviteRecord>>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): InviteData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: InviteData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getInviteRecord(guildId: string, userId: string): InviteRecord {
  const data = loadData();
  return data[guildId]?.[userId] ?? { inviterId: userId, uses: 0, left: 0, fake: 0 };
}

export function incrementInvite(guildId: string, userId: string): void {
  const data = loadData();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = { inviterId: userId, uses: 0, left: 0, fake: 0 };
  data[guildId][userId].uses++;
  saveData(data);
}

export function incrementLeft(guildId: string, userId: string): void {
  const data = loadData();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = { inviterId: userId, uses: 0, left: 0, fake: 0 };
  data[guildId][userId].left++;
  saveData(data);
}

export function resetInvites(guildId: string, userId?: string): void {
  const data = loadData();
  if (!data[guildId]) return;
  if (userId) delete data[guildId][userId];
  else data[guildId] = {};
  saveData(data);
}

export function getAllInvites(guildId: string): InviteRecord[] {
  const data = loadData();
  return Object.values(data[guildId] ?? {});
}
