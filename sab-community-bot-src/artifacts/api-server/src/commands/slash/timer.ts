import { ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { parseDuration, formatDuration } from "../../duration.js";

const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

export async function handleTimer(interaction: ChatInputCommandInteraction): Promise<void> {
  const durationStr = interaction.options.getString("duration", true);
  const message = interaction.options.getString("message") ?? null;
  const isPrivate = (interaction.options.getString("private") ?? "no") === "yes";

  const raw = parseDuration(durationStr);
  if (!raw) {
    await interaction.reply({ content: "Invalid duration. Examples: `30s`, `5m`, `2h`, `1d` (max 24h).", ephemeral: true });
    return;
  }
  const ms = Math.min(raw, MAX_TIMER_MS);
  const formatted = formatDuration(ms);
  const expiresAt = Math.floor((Date.now() + ms) / 1000);

  await interaction.reply({
    content: `⏰ Timer set for **${formatted}** — I'll ping you <t:${expiresAt}:R>.`,
    flags: isPrivate ? MessageFlags.Ephemeral : undefined,
  });

  setTimeout(async () => {
    const msg = message ? `\n> ${message}` : "";
    await interaction.followUp({
      content: `⏰ <@${interaction.user.id}> Your **${formatted}** timer is up!${msg}`,
      flags: isPrivate ? MessageFlags.Ephemeral : undefined,
    }).catch(() => null);
  }, ms);
}
