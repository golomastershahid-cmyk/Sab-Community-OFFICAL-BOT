import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";

export async function handleUnban(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
    await interaction.reply({ content: "You do not have permission to unban members.", ephemeral: true });
    return;
  }
  const userId = interaction.options.getString("user", true).trim();
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const ban = await interaction.guild.bans.fetch(userId).catch(() => null);
  if (!ban) {
    await interaction.reply({ content: `No ban found for user ID \`${userId}\`.`, ephemeral: true });
    return;
  }
  await interaction.guild.bans.remove(userId, `${executor.user.tag}: ${reason}`);
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Member Unbanned")
    .addFields(
      { name: "User", value: `${ban.user.tag} (${ban.user.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
