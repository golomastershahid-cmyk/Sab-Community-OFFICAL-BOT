import {
  ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, ButtonInteraction, MessageFlags, ChannelType, Guild,
} from "discord.js";

function boostTier(tier: number): string {
  if (tier === 0) return "No Tier";
  return `Tier ${tier}`;
}

function serverInfoEmbed(guild: Guild, ownerId: string): EmbedBuilder {
  const channels = guild.channels.cache;
  const categoryCount = channels.filter(c => c.type === ChannelType.GuildCategory).size;
  const textCount = channels.filter(c => c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === ChannelType.GuildForum).size;
  const voiceCount = channels.filter(c => c.type === ChannelType.GuildVoice || c.type === ChannelType.GuildStageVoice).size;
  const threadCount = channels.filter(c =>
    c.type === ChannelType.PublicThread ||
    c.type === ChannelType.PrivateThread ||
    c.type === ChannelType.AnnouncementThread,
  ).size;

  const boostCount = guild.premiumSubscriptionCount ?? 0;
  const tier = guild.premiumTier;

  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 64 }) ?? undefined })
    .setThumbnail(guild.iconURL({ size: 256 }) ?? null)
    .addFields(
      { name: "Owner", value: `<@${ownerId}>`, inline: true },
      { name: "Members", value: guild.memberCount.toLocaleString(), inline: true },
      { name: "Roles", value: guild.roles.cache.size.toString(), inline: true },
      { name: "Category Channels", value: categoryCount.toString(), inline: true },
      { name: "Text Channels", value: textCount.toString(), inline: true },
      { name: "Voice Channels", value: voiceCount.toString(), inline: true },
      { name: "Threads", value: threadCount.toString(), inline: true },
      { name: "Boost Count", value: `${boostCount} Boost${boostCount !== 1 ? "s" : ""} (${boostTier(tier)})`, inline: true },
    )
    .setFooter({ text: `ID: ${guild.id} | Server Created` })
    .setTimestamp(guild.createdAt);
}

export async function handleServerInfo(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply();
  const guild = await interaction.guild.fetch();
  await guild.members.fetch().catch(() => null);
  const owner = await guild.fetchOwner().catch(() => null);
  const ownerId = owner?.id ?? guild.ownerId;
  const embed = serverInfoEmbed(guild, ownerId);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`serverinfo_roles:${guild.id}`)
      .setLabel("View Roles")
      .setStyle(ButtonStyle.Primary),
  );
  await interaction.editReply({ embeds: [embed], components: [row] });
}

export async function handleServerInfoRolesButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild) return;
  const roles = interaction.guild.roles.cache
    .filter(r => r.id !== interaction.guild!.id)
    .sort((a, b) => b.position - a.position)
    .map(r => `<@&${r.id}>`)
    .join(" ");

  const chunks: string[] = [];
  let current = "";
  for (const part of roles.split(" ")) {
    if ((current + " " + part).length > 1900) {
      chunks.push(current.trim());
      current = part;
    } else {
      current += (current ? " " : "") + part;
    }
  }
  if (current) chunks.push(current.trim());

  await interaction.reply({
    content: `**Roles (${interaction.guild.roles.cache.size - 1}):**\n${chunks[0] ?? "None"}`,
    flags: MessageFlags.Ephemeral,
  });
}
