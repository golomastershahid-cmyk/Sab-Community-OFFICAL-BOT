import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { getMessageCount, getMessageLeaderboard, resetMessages } from "../../message-storage.js";

export async function handleMessages(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user") ?? interaction.user;
  const count = getMessageCount(interaction.guild.id, target.id);
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${target.tag}'s Messages`)
    .setThumbnail(target.displayAvatarURL())
    .addFields({ name: "Messages Sent", value: `${count}`, inline: true })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleMessageLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const leaderboard = getMessageLeaderboard(interaction.guild.id, 10);
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`${interaction.guild.name} — Message Leaderboard`)
    .setTimestamp();
  if (leaderboard.length === 0) {
    embed.setDescription("No message data yet.");
  } else {
    const lines = leaderboard.map((e, i) => `**${i + 1}.** <@${e.userId}> — ${e.count} messages`);
    embed.setDescription(lines.join("\n"));
  }
  await interaction.reply({ embeds: [embed] });
}

export async function handleMessageReset(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You do not have permission to reset message counts.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user");
  resetMessages(interaction.guild.id, target?.id);
  await interaction.reply({ content: target ? `Reset message count for <@${target.id}>.` : "Reset all message counts for this server.", ephemeral: true });
}
