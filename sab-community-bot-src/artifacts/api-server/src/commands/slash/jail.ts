import {
  ChatInputCommandInteraction, EmbedBuilder, GuildMember,
  PermissionFlagsBits, Role, TextChannel, Client,
} from "discord.js";
import { saveJail, getJail, removeJail, getAllJails } from "../../jail-storage.js";
import { parseDuration } from "../../duration.js";

const JAIL_ROLE_NAME = "Jailed";

async function getOrCreateJailRole(guild: NonNullable<ChatInputCommandInteraction["guild"]>): Promise<Role> {
  const existing = guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
  if (existing) return existing;
  const role = await guild.roles.create({ name: JAIL_ROLE_NAME, colors: [0x808080], reason: "Auto-created for jail command" });
  for (const [, channel] of guild.channels.cache) {
    if (channel.isTextBased() || channel.isVoiceBased()) {
      await channel.permissionOverwrites.edit(role, {
        SendMessages: false, AddReactions: false, Speak: false, Stream: false, Connect: false,
      }).catch(() => null);
    }
  }
  return role;
}

async function releaseUser(client: Client, guildId: string, userId: string): Promise<void> {
  const record = removeJail(guildId, userId);
  if (!record) return;
  try {
    const guild = await client.guilds.fetch(guildId);
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) return;
    const jailRole = guild.roles.cache.find(r => r.name === JAIL_ROLE_NAME);
    if (jailRole) await member.roles.remove(jailRole).catch(() => null);
    for (const roleId of record.savedRoles) {
      const role = guild.roles.cache.get(roleId);
      if (role && role.id !== guild.id) await member.roles.add(role).catch(() => null);
    }
    await member.send(`🔓 You have been **released from jail** in **${guild.name}**.`).catch(() => null);
  } catch { /* ignore */ }
}

export function resumeActiveJails(client: Client): void {
  for (const [guildId] of client.guilds.cache) {
    const jails = getAllJails(guildId);
    for (const jail of jails) {
      if (!jail.expiresAt) continue;
      const remaining = new Date(jail.expiresAt).getTime() - Date.now();
      if (remaining <= 0) void releaseUser(client, guildId, jail.userId);
      else setTimeout(() => void releaseUser(client, guildId, jail.userId), remaining);
    }
  }
}

export async function handleJail(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "You do not have permission to jail members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const durationStr = interaction.options.getString("duration");
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
    return;
  }
  if (!member.manageable) {
    await interaction.reply({ content: "I cannot jail this user (they may have a higher role than me).", ephemeral: true });
    return;
  }
  if (getJail(interaction.guild.id, target.id)) {
    await interaction.reply({ content: `<@${target.id}> is already jailed.`, ephemeral: true });
    return;
  }
  await interaction.deferReply();

  let durationMs: number | null = null;
  if (durationStr) {
    durationMs = parseDuration(durationStr);
    if (durationMs === null) {
      await interaction.editReply({ content: "Invalid duration. Examples: `10m`, `2h`, `1d`." });
      return;
    }
  }

  const jailRole = await getOrCreateJailRole(interaction.guild);
  const savedRoles = member.roles.cache
    .filter(r => r.id !== interaction.guild!.id && r.id !== jailRole.id)
    .map(r => r.id);

  for (const roleId of savedRoles) await member.roles.remove(roleId).catch(() => null);
  await member.roles.add(jailRole).catch(() => null);

  const expiresAt = durationMs ? new Date(Date.now() + durationMs).toISOString() : null;
  saveJail({ userId: target.id, guildId: interaction.guild.id, savedRoles, jailedAt: new Date().toISOString(), expiresAt, reason, moderatorId: executor.id });

  if (durationMs) setTimeout(() => void releaseUser(client, interaction.guild!.id, target.id), durationMs);

  await member.send(
    `🔒 You have been **jailed** in **${interaction.guild.name}**.\n**Reason:** ${reason}\n` +
    (durationMs ? `**Duration:** ${durationStr}` : "**Duration:** Until manually released")
  ).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(0x808080)
    .setTitle("🔒 Member Jailed")
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Duration", value: durationStr ?? "Permanent", inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}

export async function handleUnjail(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
    await interaction.reply({ content: "You do not have permission to unjail members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const record = getJail(interaction.guild.id, target.id);
  if (!record) {
    await interaction.reply({ content: `<@${target.id}> is not currently jailed.`, ephemeral: true });
    return;
  }
  await interaction.deferReply();
  await releaseUser(client, interaction.guild.id, target.id);
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("🔓 Member Released")
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
    )
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
