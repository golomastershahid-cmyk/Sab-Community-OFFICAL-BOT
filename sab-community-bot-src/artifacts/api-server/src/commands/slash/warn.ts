import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { addWarning, getWarnings } from "../../storage.js";

export async function handleWarn(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "You do not have permission to warn members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason", true);
  addWarning(interaction.guild.id, target.id, {
    reason,
    moderatorId: executor.id,
    timestamp: new Date().toISOString(),
  });
  const total = getWarnings(interaction.guild.id, target.id).length;
  const targetUser = await interaction.client.users.fetch(target.id).catch(() => null);
  if (targetUser) {
    await targetUser.send(`You have received a **warning** in **${interaction.guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${total}`).catch(() => null);
  }
  const embed = new EmbedBuilder()
    .setColor(0xf1c40f)
    .setTitle("Member Warned")
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Total Warnings", value: `${total}`, inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
