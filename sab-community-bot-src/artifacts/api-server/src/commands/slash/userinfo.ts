import { ChatInputCommandInteraction, EmbedBuilder, GuildMember } from "discord.js";

export async function handleUserInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  await interaction.deferReply();
  const target = interaction.options.getUser("user") ?? interaction.user;
  const member = await interaction.guild.members.fetch(target.id).catch(() => null) as GuildMember | null;

  const createdAt = Math.floor(target.createdTimestamp / 1000);
  const joinedAt = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;

  const roles = member?.roles.cache
    .filter(r => r.id !== interaction.guild!.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join(" ") || "None";

  const embed = new EmbedBuilder()
    .setColor(member?.displayHexColor ?? 0x5865f2)
    .setTitle(target.tag)
    .setThumbnail(target.displayAvatarURL({ size: 256 }))
    .addFields(
      { name: "ID", value: target.id, inline: true },
      { name: "Bot", value: target.bot ? "Yes" : "No", inline: true },
      { name: "Account Created", value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
    );

  if (joinedAt) {
    embed.addFields({ name: "Joined Server", value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false });
  }
  if (member) {
    embed.addFields({ name: `Roles (${member.roles.cache.size - 1})`, value: roles.slice(0, 1024) });
    if (member.nickname) {
      embed.addFields({ name: "Nickname", value: member.nickname, inline: true });
    }
  }
  embed.setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
