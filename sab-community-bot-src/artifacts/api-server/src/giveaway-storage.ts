import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "giveaways.json");

export interface Giveaway {
  messageId: string;
  channelId: string;
  guildId: string;
  prize: string;
  winnersCount: number;
  hostId: string;
  endsAt: string;
  ended: boolean;
  entries: string[];
  winners: string[];
  requiredRoleId?: string;
  winnersRoleId?: string;
  winnersDmMessage?: string;
  createMessage?: string;
  image?: string;
  thumbnail?: string;
  description?: string;
}

type GiveawayData = Record<string, Giveaway>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): GiveawayData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: GiveawayData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function saveGiveaway(g: Giveaway): void {
  const data = loadData();
  data[g.messageId] = g;
  saveData(data);
}

export function getGiveaway(messageId: string): Giveaway | undefined {
  return loadData()[messageId];
}

export function getActiveGiveaways(): Giveaway[] {
  return Object.values(loadData()).filter(g => !g.ended);
}

export function updateGiveaway(messageId: string, updates: Partial<Giveaway>): void {
  const data = loadData();
  if (!data[messageId]) return;
  data[messageId] = { ...data[messageId], ...updates };
  saveData(data);
}
