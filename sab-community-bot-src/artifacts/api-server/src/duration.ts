const MAX_MS = 28 * 24 * 60 * 60 * 1000;

export function parseDuration(input: string): number | null {
  const regex = /(\d+)\s*(s|sec|secs|second|seconds|m|min|mins|minute|minutes|h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks)/gi;
  let total = 0;
  let matched = false;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(input)) !== null) {
    matched = true;
    const val = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("s")) total += val * 1000;
    else if (unit.startsWith("m")) total += val * 60 * 1000;
    else if (unit.startsWith("h")) total += val * 60 * 60 * 1000;
    else if (unit.startsWith("d")) total += val * 24 * 60 * 60 * 1000;
    else if (unit.startsWith("w")) total += val * 7 * 24 * 60 * 60 * 1000;
  }
  if (!matched || total <= 0) return null;
  return Math.min(total, MAX_MS);
}

export function formatDuration(ms: number): string {
  const parts: string[] = [];
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  ms %= 24 * 60 * 60 * 1000;
  const hours = Math.floor(ms / (60 * 60 * 1000));
  ms %= 60 * 60 * 1000;
  const minutes = Math.floor(ms / (60 * 1000));
  ms %= 60 * 1000;
  const seconds = Math.floor(ms / 1000);
  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);
  return parts.join(" ") || "0s";
}
