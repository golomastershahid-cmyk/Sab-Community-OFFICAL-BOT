import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, Message } from "discord.js";
import { parseDuration, formatDuration } from "../../duration.js";

const MAX_MS = 28 * 24 * 60 * 60 * 1000;

export async function handleMuteSlash(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "You do not have permission to mute members.", ephemeral: true });
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
  if (!member.moderatable) {
    await interaction.reply({ content: "I cannot mute this user.", ephemeral: true });
    return;
  }
  const durationMs = durationStr ? (parseDuration(durationStr) ?? MAX_MS) : MAX_MS;
  await member.timeout(durationMs, `${executor.user.tag}: ${reason}`);
  await target.send(`You have been **muted** in **${interaction.guild.name}** for ${formatDuration(durationMs)}.\n**Reason:** ${reason}`).catch(() => null);
  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setTitle("Member Muted")
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Duration", value: formatDuration(durationMs), inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleMute(message: Message, args: string[]): Promise<void> {
  if (!message.guild || !message.member) return;
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply("You do not have permission to mute members.");
    return;
  }
  const mention = message.mentions.members?.first();
  if (!mention) {
    await message.reply("Please mention a user to mute. Usage: `!mute @user [reason]`");
    return;
  }
  if (!mention.moderatable) {
    await message.reply("I cannot mute this user.");
    return;
  }
  const reason = args.slice(1).join(" ") || "No reason provided";
  await mention.timeout(MAX_MS, `${message.author.tag}: ${reason}`);
  await mention.send(`You have been **muted** in **${message.guild.name}** for 28 days.\n**Reason:** ${reason}`).catch(() => null);
  await message.reply(`Muted **${mention.user.tag}** for 28 days. Reason: ${reason}`);
}
