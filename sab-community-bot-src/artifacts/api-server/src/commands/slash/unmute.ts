import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits, Message } from "discord.js";

export async function handleUnmuteSlash(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "You do not have permission to unmute members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
    return;
  }
  if (!member.isCommunicationDisabled()) {
    await interaction.reply({ content: "That user is not currently muted.", ephemeral: true });
    return;
  }
  await member.timeout(null, `Unmuted by ${executor.user.tag}`);
  const embed = new EmbedBuilder()
    .setColor(0x2ecc71)
    .setTitle("Member Unmuted")
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleUnmute(message: Message, _args: string[]): Promise<void> {
  if (!message.guild || !message.member) return;
  if (!message.member.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await message.reply("You do not have permission to unmute members.");
    return;
  }
  const mention = message.mentions.members?.first();
  if (!mention) {
    await message.reply("Please mention a user to unmute. Usage: `!unmute @user`");
    return;
  }
  if (!mention.isCommunicationDisabled()) {
    await message.reply("That user is not currently muted.");
    return;
  }
  await mention.timeout(null, `Unmuted by ${message.author.tag}`);
  await message.reply(`Unmuted **${mention.user.tag}**.`);
}
