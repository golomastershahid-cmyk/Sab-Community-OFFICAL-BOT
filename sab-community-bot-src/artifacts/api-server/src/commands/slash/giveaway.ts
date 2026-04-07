import {
  ChatInputCommandInteraction, EmbedBuilder, ButtonBuilder, ButtonStyle,
  ActionRowBuilder, Client, TextChannel, ButtonInteraction, GuildMember,
} from "discord.js";
import {
  saveGiveaway, getGiveaway, getActiveGiveaways, updateGiveaway, type Giveaway,
} from "../../giveaway-storage.js";
import { parseDuration, formatDuration } from "../../duration.js";

function buildEmbed(g: Giveaway): EmbedBuilder {
  const endsAt = Math.floor(new Date(g.endsAt).getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(g.ended ? 0x95a5a6 : 0xf1c40f)
    .setTitle(`🎉 ${g.prize}`)
    .addFields(
      { name: "Hosted by", value: `<@${g.hostId}>`, inline: true },
      { name: "Winners", value: `${g.winnersCount}`, inline: true },
      { name: "Entries", value: `${g.entries.length}`, inline: true },
      { name: g.ended ? "Ended" : "Ends", value: `<t:${endsAt}:R>` },
    );
  if (g.description) embed.setDescription(g.description);
  if (g.image) embed.setImage(g.image);
  if (g.thumbnail) embed.setThumbnail(g.thumbnail);
  if (g.requiredRoleId) embed.addFields({ name: "Required Role", value: `<@&${g.requiredRoleId}>`, inline: true });
  if (g.ended && g.winners.length > 0) embed.addFields({ name: "Winners", value: g.winners.map(id => `<@${id}>`).join(", ") });
  if (g.ended && g.winners.length === 0) embed.addFields({ name: "Winners", value: "No valid entries." });
  return embed;
}

function buildButton(disabled = false): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("giveaway_enter").setLabel("🎉 Enter").setStyle(ButtonStyle.Primary).setDisabled(disabled),
  );
}

function pickWinners(entries: string[], count: number): string[] {
  const pool = [...entries];
  const winners: string[] = [];
  while (winners.length < count && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    winners.push(pool.splice(idx, 1)[0]);
  }
  return winners;
}

async function endGiveaway(client: Client, messageId: string): Promise<void> {
  const g = getGiveaway(messageId);
  if (!g || g.ended) return;
  const winners = pickWinners(g.entries, g.winnersCount);
  updateGiveaway(messageId, { ended: true, winners });
  const updated = getGiveaway(messageId)!;
  try {
    const channel = await client.channels.fetch(g.channelId) as TextChannel;
    const message = await channel.messages.fetch(messageId);
    await message.edit({ embeds: [buildEmbed(updated)], components: [buildButton(true)] });
    const winnerMention = winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "No valid entries.";
    await channel.send(`🎉 Giveaway ended! **${g.prize}** winner${winners.length !== 1 ? "s" : ""}: ${winnerMention}`);
    if (g.winnersRoleId && winners.length > 0) {
      const guild = await client.guilds.fetch(g.guildId);
      for (const wId of winners) {
        const member = await guild.members.fetch(wId).catch(() => null);
        if (member) await member.roles.add(g.winnersRoleId).catch(() => null);
      }
    }
    if (g.winnersDmMessage && winners.length > 0) {
      for (const wId of winners) {
        const user = await client.users.fetch(wId).catch(() => null);
        if (user) await user.send(g.winnersDmMessage).catch(() => null);
      }
    }
  } catch { /* ignore */ }
}

export function resumeActiveGiveaways(client: Client): void {
  const active = getActiveGiveaways();
  for (const g of active) {
    const remaining = new Date(g.endsAt).getTime() - Date.now();
    if (remaining <= 0) {
      void endGiveaway(client, g.messageId);
    } else {
      setTimeout(() => void endGiveaway(client, g.messageId), remaining);
    }
  }
}

export async function handleGiveawayButton(interaction: ButtonInteraction): Promise<void> {
  if (!interaction.guild || !interaction.message) return;
  const messageId = interaction.message.id;
  const g = getGiveaway(messageId);
  if (!g || g.ended) {
    await interaction.reply({ content: "This giveaway has already ended.", ephemeral: true });
    return;
  }
  if (g.requiredRoleId) {
    const member = interaction.member as GuildMember;
    if (!member.roles.cache.has(g.requiredRoleId)) {
      await interaction.reply({ content: `You need the <@&${g.requiredRoleId}> role to enter.`, ephemeral: true });
      return;
    }
  }
  if (g.entries.includes(interaction.user.id)) {
    const filtered = g.entries.filter(id => id !== interaction.user.id);
    updateGiveaway(messageId, { entries: filtered });
    await interaction.reply({ content: "You have left the giveaway.", ephemeral: true });
  } else {
    updateGiveaway(messageId, { entries: [...g.entries, interaction.user.id] });
    await interaction.reply({ content: "You have entered the giveaway! Good luck 🎉", ephemeral: true });
  }
  const updated = getGiveaway(messageId)!;
  await interaction.message.edit({ embeds: [buildEmbed(updated)], components: [buildButton()] }).catch(() => null);
}

export async function handleGiveaway(interaction: ChatInputCommandInteraction, client: Client): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const sub = interaction.options.getSubcommand();

  if (sub === "create") {
    const durationStr = interaction.options.getString("duration", true);
    const winnersCount = interaction.options.getInteger("winners", true);
    const prize = interaction.options.getString("prize", true);
    const channel = (interaction.options.getChannel("channel") ?? interaction.channel) as TextChannel;
    const host = interaction.options.getUser("host") ?? interaction.user;
    const requiredRole = interaction.options.getRole("required-role");
    const winnersRole = interaction.options.getRole("giveaway-winners-role");
    const winnersDmMessage = interaction.options.getString("giveaway-winners-dm-message") ?? undefined;
    const createMessage = interaction.options.getString("giveaway-create-message") ?? undefined;
    const image = interaction.options.getString("image") ?? undefined;
    const thumbnail = interaction.options.getString("thumbnail") ?? undefined;
    const description = interaction.options.getString("description") ?? undefined;
    const ms = parseDuration(durationStr);
    if (!ms) {
      await interaction.reply({ content: "Invalid duration. Examples: `1h`, `30m`, `1d`.", ephemeral: true });
      return;
    }
    await interaction.deferReply({ ephemeral: true });
    const endsAt = new Date(Date.now() + ms).toISOString();
    const giveawayData: Omit<Giveaway, "messageId"> = {
      channelId: channel.id, guildId: interaction.guild.id, prize,
      winnersCount, hostId: host.id, endsAt, ended: false, entries: [], winners: [],
      requiredRoleId: requiredRole?.id, winnersRoleId: winnersRole?.id,
      winnersDmMessage, createMessage, image, thumbnail, description,
    };
    const placeholder: Giveaway = { ...giveawayData, messageId: "placeholder" };
    const msg = await channel.send({ embeds: [buildEmbed(placeholder)], components: [buildButton()] });
    const g: Giveaway = { ...giveawayData, messageId: msg.id };
    saveGiveaway(g);
    await msg.edit({ embeds: [buildEmbed(g)], components: [buildButton()] });
    setTimeout(() => void endGiveaway(client, msg.id), ms);
    if (createMessage) await channel.send(createMessage).catch(() => null);
    await interaction.editReply({ content: `Giveaway created in <#${channel.id}>! Ends in **${formatDuration(ms)}**.` });

  } else if (sub === "end") {
    const messageId = interaction.options.getString("message_id", true).trim();
    const g = getGiveaway(messageId);
    if (!g) { await interaction.reply({ content: "Giveaway not found.", ephemeral: true }); return; }
    if (g.ended) { await interaction.reply({ content: "This giveaway has already ended.", ephemeral: true }); return; }
    await interaction.deferReply({ ephemeral: true });
    await endGiveaway(client, messageId);
    await interaction.editReply({ content: "Giveaway ended." });

  } else if (sub === "reroll") {
    const messageId = interaction.options.getString("message_id", true).trim();
    const g = getGiveaway(messageId);
    if (!g || !g.ended) { await interaction.reply({ content: "Giveaway not found or not ended yet.", ephemeral: true }); return; }
    const winners = pickWinners(g.entries, g.winnersCount);
    updateGiveaway(messageId, { winners });
    const channel = interaction.channel as TextChannel;
    const winnerMention = winners.length > 0 ? winners.map(id => `<@${id}>`).join(", ") : "No valid entries.";
    await channel.send(`🎉 Giveaway rerolled! New winner${winners.length !== 1 ? "s" : ""}: ${winnerMention}`);
    await interaction.reply({ content: "Rerolled!", ephemeral: true });
  }
}
