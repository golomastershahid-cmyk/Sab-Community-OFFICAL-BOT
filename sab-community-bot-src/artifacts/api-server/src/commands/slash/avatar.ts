import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export async function handleAvatar(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user") ?? interaction.user;
  const avatarUrl = target.displayAvatarURL({ size: 4096 });
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${target.tag}'s Avatar`)
    .setImage(avatarUrl)
    .addFields({ name: "Links", value: `[PNG](${target.displayAvatarURL({ extension: "png", size: 4096 })}) | [JPG](${target.displayAvatarURL({ extension: "jpg", size: 4096 })}) | [WEBP](${target.displayAvatarURL({ extension: "webp", size: 4096 })})` })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
