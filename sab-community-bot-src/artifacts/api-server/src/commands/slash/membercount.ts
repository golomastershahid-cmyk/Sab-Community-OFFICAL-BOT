import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags } from "discord.js";

export async function handleMemberCount(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply();
  const guild = await interaction.guild.fetch();
  let members;
  try {
    members = await guild.members.fetch();
  } catch {
    members = guild.members.cache;
  }
  const total = members.size;
  const bots = members.filter(m => m.user.bot).size;
  const humans = total - bots;
  const online = members.filter(m => !m.user.bot && (m.presence?.status === "online" || m.presence?.status === "idle" || m.presence?.status === "dnd")).size;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${guild.name} — Member Stats`)
    .setThumbnail(guild.iconURL() ?? null)
    .addFields(
      { name: "Total Members", value: `${total}`, inline: true },
      { name: "Humans", value: `${humans}`, inline: true },
      { name: "Bots", value: `${bots}`, inline: true },
      { name: "Online", value: `${online}`, inline: true },
    )
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
