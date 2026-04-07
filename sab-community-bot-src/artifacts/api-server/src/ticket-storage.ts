import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "tickets.json");

export interface TicketConfig {
  channelId: string;
  supportRoleId: string;
  categoryId?: string;
  logChannelId?: string;
  counter: number;
  panelMessageId?: string;
}

export interface Ticket {
  ticketId: number;
  channelId: string;
  guildId: string;
  ownerId: string;
  reason: string;
  createdAt: string;
  closed: boolean;
  locked: boolean;
  addedUsers: string[];
}

interface TicketData {
  configs: Record<string, TicketConfig>;
  tickets: Record<string, Ticket>;
}

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): TicketData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return { configs: {}, tickets: {} };
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return { configs: {}, tickets: {} }; }
}

function saveData(data: TicketData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function getConfig(guildId: string): TicketConfig | null {
  return loadData().configs[guildId] ?? null;
}

export function saveConfig(guildId: string, config: TicketConfig): void {
  const data = loadData();
  data.configs[guildId] = config;
  saveData(data);
}

export function nextTicketNumber(guildId: string): number {
  const data = loadData();
  if (!data.configs[guildId]) return 1;
  data.configs[guildId].counter = (data.configs[guildId].counter ?? 0) + 1;
  saveData(data);
  return data.configs[guildId].counter;
}

export function saveTicket(ticket: Ticket): void {
  const data = loadData();
  data.tickets[ticket.channelId] = ticket;
  saveData(data);
}

export function getTicket(channelId: string): Ticket | null {
  return loadData().tickets[channelId] ?? null;
}

export function closeTicket(channelId: string): void {
  const data = loadData();
  if (data.tickets[channelId]) {
    data.tickets[channelId].closed = true;
    data.tickets[channelId].locked = true;
    saveData(data);
  }
}

export function reopenTicket(channelId: string): void {
  const data = loadData();
  if (data.tickets[channelId]) {
    data.tickets[channelId].closed = false;
    data.tickets[channelId].locked = false;
    saveData(data);
  }
}

export function deleteTicketRecord(channelId: string): void {
  const data = loadData();
  delete data.tickets[channelId];
  saveData(data);
}

export function updateTicketUsers(channelId: string, addedUsers: string[]): void {
  const data = loadData();
  if (data.tickets[channelId]) {
    data.tickets[channelId].addedUsers = addedUsers;
    saveData(data);
  }
}
