import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export async function handleChoose(interaction: ChatInputCommandInteraction): Promise<void> {
  const raw = interaction.options.getString("options", true);
  const choices = raw.split(",").map(s => s.trim()).filter(Boolean);
  if (choices.length < 2) {
    await interaction.reply({ content: "Please provide at least 2 comma-separated choices.", ephemeral: true });
    return;
  }
  const picked = choices[Math.floor(Math.random() * choices.length)];
  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setTitle("🎲 I choose…")
    .setDescription(`**${picked}**`)
    .addFields({ name: "Options", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n") })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
