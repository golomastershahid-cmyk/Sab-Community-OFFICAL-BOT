import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { getInviteRecord, getAllInvites, resetInvites } from "../../invite-storage.js";

export async function handleInviteLink(interaction: ChatInputCommandInteraction): Promise<void> {
  const clientId = process.env["DISCORD_CLIENT_ID"] ?? interaction.client.user!.id;
  const url = `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=8&scope=bot%20applications.commands`;
  await interaction.reply({ content: `[Click here to invite the bot](${url})`, ephemeral: true });
}

export async function handleInvites(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user") ?? interaction.user;
  const record = getInviteRecord(interaction.guild.id, target.id);
  const real = record.uses - record.left - record.fake;
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${target.tag}'s Invites`)
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "Total", value: `${record.uses}`, inline: true },
      { name: "Real", value: `${real}`, inline: true },
      { name: "Left", value: `${record.left}`, inline: true },
      { name: "Fake", value: `${record.fake}`, inline: true },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleInvited(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.reply({ content: "Detailed member tracking is not yet available.", ephemeral: true });
}

export async function handleInviteLeaderboard(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const records = getAllInvites(interaction.guild.id)
    .map(r => ({ ...r, real: r.uses - r.left - r.fake }))
    .sort((a, b) => b.real - a.real)
    .slice(0, 10);
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${interaction.guild.name} — Invite Leaderboard`)
    .setTimestamp();
  if (records.length === 0) {
    embed.setDescription("No invite data yet.");
  } else {
    const lines = records.map((r, i) => `**${i + 1}.** <@${r.inviterId}> — ${r.real} real (${r.uses} total, ${r.left} left)`);
    embed.setDescription(lines.join("\n"));
  }
  await interaction.reply({ embeds: [embed] });
}

export async function handleInviteReset(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You do not have permission to reset invites.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user");
  resetInvites(interaction.guild.id, target?.id);
  await interaction.reply({ content: target ? `Reset invites for <@${target.id}>.` : "Reset all invite data for this server.", ephemeral: true });
}
