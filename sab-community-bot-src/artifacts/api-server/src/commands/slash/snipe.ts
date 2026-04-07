import { ChatInputCommandInteraction, EmbedBuilder, MessageFlags, TextChannel } from "discord.js";
import { getDeletedMessage, getEditedMessage, getRemovedReaction } from "../../snipe-storage.js";

export async function handleSnipe(interaction: ChatInputCommandInteraction): Promise<void> {
  const numBack = Math.max(1, interaction.options.getInteger("num_back") ?? 1);
  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;
  const ephemeral = (interaction.options.getString("ephemeral") ?? "false") === "true";

  const msg = getDeletedMessage(channel.id, numBack - 1);
  if (!msg) {
    await interaction.reply({
      content: `No deleted message found${numBack > 1 ? ` at position #${numBack}` : ""} in <#${channel.id}>.`,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setAuthor({ name: msg.authorTag, iconURL: msg.authorAvatar ?? undefined })
    .setDescription(msg.content || "*No text content*")
    .setFooter({ text: `Deleted • #${numBack}` })
    .setTimestamp(msg.deletedAt);

  if (msg.attachments.length > 0) {
    embed.setImage(msg.attachments[0]);
    if (msg.attachments.length > 1) {
      embed.addFields({ name: "Other Attachments", value: msg.attachments.slice(1).map((u, i) => `[Attachment ${i + 2}](${u})`).join("\n") });
    }
  }

  await interaction.reply({ embeds: [embed], flags: ephemeral ? MessageFlags.Ephemeral : undefined });
}

export async function handleEsnipe(interaction: ChatInputCommandInteraction): Promise<void> {
  const numBack = Math.max(1, interaction.options.getInteger("num_back") ?? 1);
  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;
  const ephemeral = (interaction.options.getString("ephemeral") ?? "false") === "true";

  const msg = getEditedMessage(channel.id, numBack - 1);
  if (!msg) {
    await interaction.reply({
      content: `No edited message found${numBack > 1 ? ` at position #${numBack}` : ""} in <#${channel.id}>.`,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0xf39c12)
    .setAuthor({ name: msg.authorTag, iconURL: msg.authorAvatar ?? undefined })
    .addFields(
      { name: "Before", value: msg.before || "*No text content*" },
      { name: "After", value: msg.after || "*No text content*" },
    )
    .setFooter({ text: `Edited • #${numBack}` })
    .setTimestamp(msg.editedAt);

  if (msg.messageUrl) {
    embed.addFields({ name: "Jump to Message", value: `[Click here](${msg.messageUrl})` });
  }

  await interaction.reply({ embeds: [embed], flags: ephemeral ? MessageFlags.Ephemeral : undefined });
}

export async function handleRsnipe(interaction: ChatInputCommandInteraction): Promise<void> {
  const numBack = Math.max(1, interaction.options.getInteger("num_back") ?? 1);
  const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;
  const ephemeral = (interaction.options.getString("ephemeral") ?? "false") === "true";

  const r = getRemovedReaction(channel.id, numBack - 1);
  if (!r) {
    await interaction.reply({
      content: `No removed reaction found${numBack > 1 ? ` at position #${numBack}` : ""} in <#${channel.id}>.`,
      flags: ephemeral ? MessageFlags.Ephemeral : undefined,
    });
    return;
  }

  const embed = new EmbedBuilder()
    .setColor(0x9b59b6)
    .setDescription(`<@${r.userId}> removed ${r.emoji} from [a message](https://discord.com/channels/${interaction.guildId}/${r.channelId}/${r.messageId})`)
    .setFooter({ text: `Removed reaction • #${numBack}` })
    .setTimestamp(r.removedAt);

  await interaction.reply({ embeds: [embed], flags: ephemeral ? MessageFlags.Ephemeral : undefined });
}
