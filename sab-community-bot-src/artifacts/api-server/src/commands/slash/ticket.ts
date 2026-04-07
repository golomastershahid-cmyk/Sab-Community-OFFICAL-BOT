import {
  ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, GuildMember, PermissionFlagsBits, ChannelType,
  ButtonInteraction, TextChannel, Client, MessageFlags,
  ModalBuilder, TextInputBuilder, TextInputStyle, ModalSubmitInteraction,
} from "discord.js";
import {
  getConfig, saveConfig, nextTicketNumber, saveTicket,
  getTicket, closeTicket, reopenTicket, deleteTicketRecord, updateTicketUsers,
} from "../../ticket-storage.js";

function openPanelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("🎫 Support Tickets")
    .setDescription(
      "Need help? Click the button below to open a support ticket.\n\n" +
      "A private channel will be created just for you and our support team.",
    )
    .setFooter({ text: "One ticket per user at a time" });
}

function openPanelRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("ticket_create").setLabel("Create Ticket").setEmoji("🎫").setStyle(ButtonStyle.Primary),
  );
}

function closeButtonRow(channelId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_close:${channelId}`).setLabel("Close").setEmoji("🔒").setStyle(ButtonStyle.Danger),
  );
}

function closedControlRow(channelId: string): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId(`ticket_transcript:${channelId}`).setLabel("Transcript").setEmoji("📄").setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`ticket_open:${channelId}`).setLabel("Open").setEmoji("🔓").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId(`ticket_delete:${channelId}`).setLabel("Delete").setEmoji("🚫").setStyle(ButtonStyle.Danger),
  );
}

async function doCloseTicket(
  channel: TextChannel,
  ownerId: string,
  closedByTag: string,
  closedById: string,
  guildId: string,
  client: Client,
): Promise<void> {
  closeTicket(channel.id);

  await channel.permissionOverwrites.edit(ownerId, { SendMessages: false }).catch(() => null);

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🔒 Ticket Closed")
    .setDescription(`Closed by <@${closedById}>`)
    .setTimestamp();

  await channel.send({ embeds: [embed], components: [closedControlRow(channel.id)] });

  const config = getConfig(guildId);
  if (config?.logChannelId) {
    const logChannel = (await client.channels.fetch(config.logChannelId).catch(() => null)) as TextChannel | null;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0xe74c3c)
            .setTitle("🔒 Ticket Closed")
            .addFields(
              { name: "Channel", value: channel.name, inline: true },
              { name: "Closed By", value: closedByTag, inline: true },
              { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            )
            .setTimestamp(),
        ],
      }).catch(() => null);
    }
  }
}

export async function handleTicketSetup(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You need **Manage Server** permission to set up tickets.", flags: MessageFlags.Ephemeral });
    return;
  }
  const panelChannel = interaction.options.getChannel("channel", true) as TextChannel;
  const supportRole = interaction.options.getRole("support_role", true);
  const category = interaction.options.getChannel("category");
  const logChannel = interaction.options.getChannel("log_channel") as TextChannel | null;

  if (category && category.type !== ChannelType.GuildCategory) {
    await interaction.reply({ content: "The **category** option must be an actual Discord category.", flags: MessageFlags.Ephemeral });
    return;
  }

  const config = getConfig(interaction.guild.id) ?? { channelId: "", supportRoleId: "", counter: 0 };
  config.channelId = panelChannel.id;
  config.supportRoleId = supportRole.id;
  if (category) config.categoryId = category.id;
  else delete config.categoryId;
  if (logChannel) config.logChannelId = logChannel.id;
  saveConfig(interaction.guild.id, config);

  const msg = await panelChannel.send({ embeds: [openPanelEmbed()], components: [openPanelRow()] });
  config.panelMessageId = msg.id;
  saveConfig(interaction.guild.id, config);

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(0x2ecc71)
        .setTitle("✅ Ticket System Set Up")
        .addFields(
          { name: "Panel Channel", value: `<#${panelChannel.id}>`, inline: true },
          { name: "Support Role", value: `<@&${supportRole.id}>`, inline: true },
          { name: "Category", value: category ? `<#${category.id}>` : "None", inline: true },
          { name: "Log Channel", value: logChannel ? `<#${logChannel.id}>` : "None", inline: true },
        ),
    ],
    flags: MessageFlags.Ephemeral,
  });
}

export async function handleTicketClose(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const ticket = getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This channel is not a ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  if (ticket.locked) {
    await interaction.reply({ content: "This ticket is already closed.", flags: MessageFlags.Ephemeral });
    return;
  }
  const config = getConfig(interaction.guild.id);
  const executor = interaction.member as GuildMember;
  const isSupport = config && executor.roles.cache.has(config.supportRoleId);
  const isOwner = ticket.ownerId === executor.id;
  if (!isSupport && !isOwner && !executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "Only the ticket owner or support staff can close this ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content: "Closing ticket…", flags: MessageFlags.Ephemeral });
  await doCloseTicket(interaction.channel as TextChannel, ticket.ownerId, executor.user.tag, executor.id, interaction.guild.id, interaction.client);
}

export async function handleTicketAdd(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const ticket = getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This channel is not a ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const channel = interaction.channel as TextChannel;
  await channel.permissionOverwrites.edit(target.id, {
    ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
  });
  const added = [...new Set([...ticket.addedUsers, target.id])];
  updateTicketUsers(ticket.channelId, added);
  await interaction.reply({ content: `<@${target.id}> has been added to the ticket.` });
}

export async function handleTicketRemove(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) return;
  const ticket = getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: "This channel is not a ticket.", flags: MessageFlags.Ephemeral });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const channel = interaction.channel as TextChannel;
  await channel.permissionOverwrites.delete(target.id);
  const removed = ticket.addedUsers.filter(id => id !== target.id);
  updateTicketUsers(ticket.channelId, removed);
  await interaction.reply({ content: `<@${target.id}> has been removed from the ticket.` });
}

export async function handleCreateTicketButton(interaction: ButtonInteraction, _client: Client): Promise<void> {
  if (!interaction.guild) return;
  const config = getConfig(interaction.guild.id);
  if (!config) {
    await interaction.reply({ content: "Ticket system is not configured for this server.", flags: MessageFlags.Ephemeral });
    return;
  }
  const existing = interaction.guild.channels.cache.find(ch => {
    if (!ch.isTextBased()) return false;
    const t = getTicket(ch.id);
    return t?.ownerId === interaction.user.id && !t.locked;
  });
  if (existing) {
    await interaction.reply({ content: `You already have an open ticket: <#${existing.id}>`, flags: MessageFlags.Ephemeral });
    return;
  }
  const modal = new ModalBuilder().setCustomId("ticket_reason_modal").setTitle("Create a Ticket");
  const reasonInput = new TextInputBuilder()
    .setCustomId("ticket_reason")
    .setLabel("Why are you creating this ticket?")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder("e.g. Need help, Report issue...")
    .setRequired(true)
    .setMaxLength(200);
  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput));
  await interaction.showModal(modal);
}

export async function handleTicketReasonModal(interaction: ModalSubmitInteraction, client: Client): Promise<void> {
  if (!interaction.guild) return;
  const config = getConfig(interaction.guild.id);
  if (!config) {
    await interaction.reply({ content: "Ticket system is not configured.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const reason = interaction.fields.getTextInputValue("ticket_reason").trim();

  const existing = interaction.guild.channels.cache.find(ch => {
    if (!ch.isTextBased()) return false;
    const t = getTicket(ch.id);
    return t?.ownerId === interaction.user.id && !t.locked;
  });
  if (existing) {
    await interaction.editReply({ content: `You already have an open ticket: <#${existing.id}>` });
    return;
  }

  const ticketNum = nextTicketNumber(interaction.guild.id);
  const safeName = interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20) || "user";
  const channelName = `ticket-${String(ticketNum).padStart(4, "0")}-${safeName}`;

  const channelOptions: Parameters<typeof interaction.guild.channels.create>[0] = {
    name: channelName,
    type: ChannelType.GuildText,
    permissionOverwrites: [
      { id: interaction.guild.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.AttachFiles] },
      { id: config.supportRoleId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages, PermissionFlagsBits.AttachFiles] },
      { id: client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages] },
    ],
  };
  if (config.categoryId) {
    const cat = interaction.guild.channels.cache.get(config.categoryId);
    if (cat && cat.type === ChannelType.GuildCategory) channelOptions.parent = config.categoryId;
  }

  const ticketChannel = await interaction.guild.channels.create(channelOptions) as TextChannel;
  const ticket = {
    ticketId: ticketNum, channelId: ticketChannel.id, guildId: interaction.guild.id,
    ownerId: interaction.user.id, reason, createdAt: new Date().toISOString(),
    closed: false, locked: false, addedUsers: [] as string[],
  };
  saveTicket(ticket);

  const supportEmbed = new EmbedBuilder().setColor(0x2b2d31).setDescription("Support will be with you soon, please describe your issue and wait for a response.");
  const reasonEmbed = new EmbedBuilder().setColor(0x2b2d31).addFields({ name: "Why are you creating this ticket?", value: `\`\`\`${reason}\`\`\`` });

  await ticketChannel.send({
    content: `Hello <@${interaction.user.id}> Welcome <@&${config.supportRoleId}>`,
    embeds: [supportEmbed, reasonEmbed],
    components: [closeButtonRow(ticketChannel.id)],
  });

  if (config.logChannelId) {
    const logChannel = interaction.guild.channels.cache.get(config.logChannelId) as TextChannel | undefined;
    if (logChannel) {
      await logChannel.send({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2ecc71)
            .setTitle("🎫 Ticket Opened")
            .addFields(
              { name: "Ticket", value: `<#${ticketChannel.id}>`, inline: true },
              { name: "User", value: `<@${interaction.user.id}>`, inline: true },
              { name: "Reason", value: reason, inline: false },
              { name: "Time", value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true },
            ).setTimestamp(),
        ],
      }).catch(() => null);
    }
  }
  await interaction.editReply({ content: `Your ticket has been created: <#${ticketChannel.id}>` });
}

export async function handleCloseTicketButton(interaction: ButtonInteraction, channelId: string, client: Client): Promise<void> {
  if (!interaction.guild) return;
  const ticket = getTicket(channelId);
  if (!ticket || ticket.locked) {
    await interaction.reply({ content: "This ticket is already closed.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.reply({ content: "Closing ticket…", flags: MessageFlags.Ephemeral });
  await doCloseTicket(interaction.channel as TextChannel, ticket.ownerId, interaction.user.tag, interaction.user.id, interaction.guild.id, client);
}

export async function handleOpenTicketButton(interaction: ButtonInteraction, channelId: string): Promise<void> {
  if (!interaction.guild) return;
  const ticket = getTicket(channelId);
  if (!ticket) {
    await interaction.reply({ content: "Ticket not found.", flags: MessageFlags.Ephemeral });
    return;
  }
  const config = getConfig(interaction.guild.id);
  const executor = interaction.member as GuildMember;
  const isSupport = config && executor.roles.cache.has(config.supportRoleId);
  if (!isSupport && !executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "Only support staff can reopen tickets.", flags: MessageFlags.Ephemeral });
    return;
  }
  reopenTicket(channelId);
  const channel = interaction.channel as TextChannel;
  await channel.permissionOverwrites.edit(ticket.ownerId, { SendMessages: true }).catch(() => null);
  const embed = new EmbedBuilder().setColor(0x2ecc71).setTitle("🔓 Ticket Reopened").setDescription(`Reopened by <@${interaction.user.id}>`).setTimestamp();
  await interaction.update({ embeds: [embed], components: [closeButtonRow(channelId)] });
}

export async function handleDeleteTicketButton(interaction: ButtonInteraction, channelId: string): Promise<void> {
  if (!interaction.guild) return;
  const config = getConfig(interaction.guild.id);
  const executor = interaction.member as GuildMember;
  const isSupport = config && executor.roles.cache.has(config.supportRoleId);
  if (!isSupport && !executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "Only support staff can delete tickets.", flags: MessageFlags.Ephemeral });
    return;
  }
  deleteTicketRecord(channelId);
  const channel = interaction.channel as TextChannel;
  await interaction.reply({ content: "Deleting ticket in 3 seconds…", flags: MessageFlags.Ephemeral });
  setTimeout(() => channel.delete().catch(() => null), 3000);
}

export async function handleTranscriptButton(interaction: ButtonInteraction, channelId: string): Promise<void> {
  if (!interaction.guild) return;
  const config = getConfig(interaction.guild.id);
  const executor = interaction.member as GuildMember;
  const isSupport = config && executor.roles.cache.has(config.supportRoleId);
  if (!isSupport && !executor.permissions.has(PermissionFlagsBits.ManageChannels)) {
    await interaction.reply({ content: "Only support staff can view transcripts.", flags: MessageFlags.Ephemeral });
    return;
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  const channel = interaction.channel as TextChannel;
  const messages = await channel.messages.fetch({ limit: 100 });
  const lines = messages
    .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
    .map(m => `[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.content || "[embed/attachment]"}`)
    .join("\n");
  const content = lines.slice(0, 1900) || "No messages found.";
  await interaction.editReply({ content: `**Transcript for #${channel.name}:**\n\`\`\`\n${content}\n\`\`\`` });
}
