import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { Message } from "discord.js";

export async function handleKickSlash(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
    await interaction.reply({ content: "You do not have permission to kick members.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const reason = interaction.options.getString("reason") ?? "No reason provided";
  const member = await interaction.guild.members.fetch(target.id).catch(() => null);
  if (!member) {
    await interaction.reply({ content: "That user is not in this server.", ephemeral: true });
    return;
  }
  if (!member.kickable) {
    await interaction.reply({ content: "I cannot kick this user.", ephemeral: true });
    return;
  }
  await target.send(`You have been **kicked** from **${interaction.guild.name}**.\n**Reason:** ${reason}`).catch(() => null);
  await member.kick(`${executor.user.tag}: ${reason}`);
  const embed = new EmbedBuilder()
    .setColor(0xe67e22)
    .setTitle("Member Kicked")
    .setThumbnail(target.displayAvatarURL())
    .addFields(
      { name: "User", value: `${target.tag} (${target.id})`, inline: true },
      { name: "Moderator", value: executor.user.tag, inline: true },
      { name: "Reason", value: reason },
    )
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}

export async function handleKick(message: Message, args: string[]): Promise<void> {
  if (!message.guild || !message.member) return;
  if (!message.member.permissions.has(PermissionFlagsBits.KickMembers)) {
    await message.reply("You do not have permission to kick members.");
    return;
  }
  const mention = message.mentions.members?.first();
  if (!mention) {
    await message.reply("Please mention a user to kick. Usage: `!kick @user [reason]`");
    return;
  }
  if (!mention.kickable) {
    await message.reply("I cannot kick this user.");
    return;
  }
  const reason = args.slice(1).join(" ") || "No reason provided";
  await mention.send(`You have been **kicked** from **${message.guild.name}**.\n**Reason:** ${reason}`).catch(() => null);
  await mention.kick(`${message.author.tag}: ${reason}`);
  await message.reply(`Kicked **${mention.user.tag}**. Reason: ${reason}`);
}
