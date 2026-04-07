import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "prefixes.json");
const DEFAULT_PREFIX = ",";

type PrefixData = Record<string, string>;

function ensureDir(): void {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(): PrefixData {
  ensureDir();
  if (!fs.existsSync(DATA_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8")); }
  catch { return {}; }
}

function saveData(data: PrefixData): void {
  ensureDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function setPrefix(guildId: string, prefix: string): void {
  const data = loadData();
  data[guildId] = prefix;
  saveData(data);
}

export function getPrefix(guildId: string): string {
  return loadData()[guildId] ?? DEFAULT_PREFIX;
}
