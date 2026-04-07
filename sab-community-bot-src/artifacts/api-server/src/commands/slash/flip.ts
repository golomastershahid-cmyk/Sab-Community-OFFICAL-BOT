import { ChatInputCommandInteraction } from "discord.js";

export async function handleFlipChallenge(interaction: ChatInputCommandInteraction): Promise<void> {
  const result = Math.random() < 0.5 ? "🪙 Heads." : "🪙 Tails.";
  await interaction.reply({ content: `<@${interaction.user.id}> ${result}` });
}
