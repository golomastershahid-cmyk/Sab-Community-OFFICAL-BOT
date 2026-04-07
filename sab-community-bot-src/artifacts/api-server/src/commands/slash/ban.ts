import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";

export async function handleBan(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "You do not have permission to ban members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (member && !member.bannable) {
    await interaction.reply({ content: "I cannot ban this user.", ephemeral: true });
    return;
  }
  await target.send(`You have been **banned** from **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => null);
  await interaction.guild.bans.create(target.id, { reason: `${executor.user.tag}: ${reason}` });
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("Member Banned")
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
