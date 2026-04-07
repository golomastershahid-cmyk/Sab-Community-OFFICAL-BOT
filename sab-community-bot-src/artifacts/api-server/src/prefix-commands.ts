import {
  Message, EmbedBuilder, PermissionFlagsBits, GuildMember, TextChannel, ChannelType,
} from "discord.js";
import { addWarning, getWarnings } from "./storage.js";
import { getMessageCount, getMessageLeaderboard } from "./message-storage.js";
import { getInviteRecord, getAllInvites } from "./invite-storage.js";
import { setAfk } from "./afk-storage.js";
import { parseDuration, formatDuration } from "./duration.js";
import { getDeletedMessage, getEditedMessage, getRemovedReaction } from "./snipe-storage.js";
import { setPrefix } from "./prefix-storage.js";

const MAX_MUTE_MS = 28 * 24 * 60 * 60 * 1000;
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;
const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

const ROASTS = [
  "You're the reason the gene pool needs a lifeguard.",
  "I'd agree with you, but then we'd both be wrong.",
  "You're proof that evolution can go in reverse.",
  "If brains were taxed, you'd get a refund.",
  "I'd call you a tool, but even tools are useful.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "Somewhere out there is a tree tirelessly producing oxygen for you. You owe it an apology.",
  "You're not stupid; you just have bad luck thinking.",
  "I'd explain it to you, but I don't have crayons with me.",
  "I would roast you harder, but my mom told me not to burn trash.",
];

const SUBREDDITS = ["memes", "dankmemes", "me_irl", "funny", "comedyheaven"];

const WYR_SCENARIOS: [string, string][] = [
  ["Be able to fly", "Be able to breathe underwater"],
  ["Always know when someone is lying", "Always get away with lying yourself"],
  ["Be famous but broke", "Be rich but unknown"],
  ["Fight 100 duck-sized horses", "Fight 1 horse-sized duck"],
  ["Have super strength", "Have super speed"],
  ["Never have to sleep", "Never have to eat"],
  ["Be the funniest person in the room", "Be the smartest person in the room"],
  ["Have a photographic memory", "Be able to forget anything on command"],
];

const TRUTHS = [
  "What's the most embarrassing thing that has ever happened to you?",
  "Have you ever lied to get out of trouble? What was it?",
  "What's a secret you've never told anyone?",
  "Have you ever cheated on a test or game?",
  "What's your biggest fear?",
  "What's the biggest lie you've ever told?",
  "What's the most ridiculous thing you've ever cried about?",
];

const DARES = [
  "Do your best impression of someone in this server.",
  "Type only in capitals for the next 5 minutes.",
  "Change your nickname to 'Potato' for 10 minutes.",
  "Send a GIF that describes your personality right now.",
  "Type a compliment to every person in this chat.",
  "Do 10 push-ups and report back.",
  "Speak in rhymes for your next 3 messages.",
];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

async function fetchMeme(): Promise<{ title: string; url: string; postLink: string; ups: number; subreddit: string } | null> {
  const sub = rand(SUBREDDITS);
  try {
    const res = await fetch(`https://meme-api.com/gimme/${sub}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const json = await res.json() as any;
    if (!json?.url || json.nsfw || json.spoiler) return null;
    return { title: json.title, url: json.url, postLink: json.postLink, ups: json.ups, subreddit: json.subreddit };
  } catch { return null; }
}

export async function handlePrefixCommand(message: Message, command: string, args: string[]): Promise<void> {
  if (!message.guild || !message.member) return;
  const guild = message.guild;
  const executor = message.member;
  const prefix = message.content.split(/\s/)[0]?.slice(0, -command.length) || "!";

  switch (command) {

    /* ─── MODERATION ─────────────────────────────────────────── */

    case "ban": {
      if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
        await message.reply("❌ You need the **Ban Members** permission."); return;
      }
      const target = message.mentions.users.first();
      if (!target) { await message.reply(`Usage: \`${prefix}ban @user [reason]\``); return; }
      const reason = args.slice(1).join(" ") || "No reason provided";
      const member = await guild.members.fetch(target.id).catch(() => null);
      if (member && !member.bannable) { await message.reply("❌ I cannot ban this user."); return; }
      await target.send(`You have been **banned** from **${guild.name}**.\n**Reason:** ${reason}`).catch(() => null);
      await guild.bans.create(target.id, { reason: `${executor.user.tag}: ${reason}` });
      await message.reply(`✅ Banned **${target.tag}**. Reason: ${reason}`);
      break;
    }

    case "unban": {
      if (!executor.permissions.has(PermissionFlagsBits.BanMembers)) {
        await message.reply("❌ You need the **Ban Members** permission."); return;
      }
      const userId = args[0];
      if (!userId) { await message.reply(`Usage: \`${prefix}unban <user_id> [reason]\``); return; }
      const reason = args.slice(1).join(" ") || "No reason provided";
      await guild.bans.remove(userId, `${executor.user.tag}: ${reason}`).catch(async () => {
        await message.reply("❌ Could not unban that user. Make sure the ID is correct and they are banned.");
        return;
      });
      await message.reply(`✅ Unbanned user \`${userId}\`. Reason: ${reason}`);
      break;
    }

    case "kick": {
      if (!executor.permissions.has(PermissionFlagsBits.KickMembers)) {
        await message.reply("❌ You need the **Kick Members** permission."); return;
      }
      const target = message.mentions.members?.first();
      if (!target) { await message.reply(`Usage: \`${prefix}kick @user [reason]\``); return; }
      if (!target.kickable) { await message.reply("❌ I cannot kick this user."); return; }
      const reason = args.slice(1).join(" ") || "No reason provided";
      await target.send(`You have been **kicked** from **${guild.name}**.\n**Reason:** ${reason}`).catch(() => null);
      await target.kick(`${executor.user.tag}: ${reason}`);
      await message.reply(`✅ Kicked **${target.user.tag}**. Reason: ${reason}`);
      break;
    }

    case "mute": {
      if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await message.reply("❌ You need the **Moderate Members** permission."); return;
      }
      const target = message.mentions.members?.first();
      if (!target) { await message.reply(`Usage: \`${prefix}mute @user [duration] [reason]\``); return; }
      if (!target.moderatable) { await message.reply("❌ I cannot mute this user."); return; }
      const durationStr = args[1];
      const parsed = durationStr ? parseDuration(durationStr) : null;
      const durationMs = parsed ?? MAX_MUTE_MS;
      const reasonStart = parsed ? 2 : 1;
      const reason = args.slice(reasonStart).join(" ") || "No reason provided";
      await target.timeout(durationMs, `${executor.user.tag}: ${reason}`);
      await target.send(`You have been **muted** in **${guild.name}** for ${formatDuration(durationMs)}.\n**Reason:** ${reason}`).catch(() => null);
      await message.reply(`✅ Muted **${target.user.tag}** for **${formatDuration(durationMs)}**. Reason: ${reason}`);
      break;
    }

    case "unmute": {
      if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await message.reply("❌ You need the **Moderate Members** permission."); return;
      }
      const target = message.mentions.members?.first();
      if (!target) { await message.reply(`Usage: \`${prefix}unmute @user\``); return; }
      await target.timeout(null, `Unmuted by ${executor.user.tag}`);
      await message.reply(`✅ Unmuted **${target.user.tag}**.`);
      break;
    }

    case "purge": {
      if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply("❌ You need the **Manage Messages** permission."); return;
      }
      const amount = parseInt(args[0] ?? "");
      if (isNaN(amount) || amount < 1 || amount > 100) {
        await message.reply(`Usage: \`${prefix}purge <1-100>\``); return;
      }
      const channel = message.channel as TextChannel;
      const deleted = await channel.bulkDelete(amount + 1, true).catch(() => null);
      const count = Math.max(0, (deleted?.size ?? 0) - 1);
      const confirm = await message.channel.send(`🗑️ Deleted **${count}** message${count !== 1 ? "s" : ""}.`);
      setTimeout(() => confirm.delete().catch(() => null), 4000);
      break;
    }

    case "warn": {
      if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await message.reply("❌ You need the **Moderate Members** permission."); return;
      }
      const target = message.mentions.users.first();
      if (!target) { await message.reply(`Usage: \`${prefix}warn @user <reason>\``); return; }
      const reason = args.slice(1).join(" ");
      if (!reason) { await message.reply(`Usage: \`${prefix}warn @user <reason>\``); return; }
      addWarning(guild.id, target.id, { reason, moderatorId: executor.id, timestamp: new Date().toISOString() });
      const total = getWarnings(guild.id, target.id).length;
      await target.send(`You received a **warning** in **${guild.name}**.\n**Reason:** ${reason}\n**Total warnings:** ${total}`).catch(() => null);
      await message.reply(`⚠️ Warned **${target.tag}**. They now have **${total}** warning${total !== 1 ? "s" : ""}. Reason: ${reason}`);
      break;
    }

    case "warnings": {
      if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await message.reply("❌ You need the **Moderate Members** permission."); return;
      }
      const target = message.mentions.users.first();
      if (!target) { await message.reply(`Usage: \`${prefix}warnings @user\``); return; }
      const warns = getWarnings(guild.id, target.id);
      if (warns.length === 0) { await message.reply(`${target.tag} has no warnings.`); return; }
      const embed = new EmbedBuilder()
        .setColor(0xf1c40f)
        .setTitle(`⚠️ Warnings — ${target.tag}`)
        .setDescription(warns.map((w, i) => `**${i + 1}.** ${w.reason} — <@${w.moderatorId}> <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`).join("\n"))
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    /* ─── INFO ───────────────────────────────────────────────── */

    case "userinfo": {
      const target = message.mentions.users.first() ?? message.author;
      const member = await guild.members.fetch(target.id).catch(() => null) as GuildMember | null;
      const createdAt = Math.floor(target.createdTimestamp / 1000);
      const joinedAt = member?.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
      const roles = member?.roles.cache
        .filter(r => r.id !== guild.id)
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
      if (joinedAt) embed.addFields({ name: "Joined Server", value: `<t:${joinedAt}:D> (<t:${joinedAt}:R>)`, inline: false });
      if (member) {
        embed.addFields({ name: `Roles (${member.roles.cache.size - 1})`, value: roles.slice(0, 1024) });
        if (member.nickname) embed.addFields({ name: "Nickname", value: member.nickname, inline: true });
      }
      embed.setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "membercount": {
      let members;
      try { members = await guild.members.fetch(); } catch { members = guild.members.cache; }
      const total = members.size;
      const bots = members.filter(m => m.user.bot).size;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${guild.name} — Member Stats`)
        .setThumbnail(guild.iconURL() ?? null)
        .addFields(
          { name: "Total Members", value: `${total}`, inline: true },
          { name: "Humans", value: `${total - bots}`, inline: true },
          { name: "Bots", value: `${bots}`, inline: true },
        )
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "serverinfo": {
      const g = await guild.fetch();
      const owner = await g.fetchOwner().catch(() => null);
      const ownerId = owner?.id ?? g.ownerId;
      const channels = g.channels.cache;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setAuthor({ name: g.name, iconURL: g.iconURL({ size: 64 }) ?? undefined })
        .setThumbnail(g.iconURL({ size: 256 }) ?? null)
        .addFields(
          { name: "Owner", value: `<@${ownerId}>`, inline: true },
          { name: "Members", value: `${g.memberCount}`, inline: true },
          { name: "Roles", value: `${g.roles.cache.size}`, inline: true },
          { name: "Text Channels", value: `${channels.filter(c => c.type === ChannelType.GuildText).size}`, inline: true },
          { name: "Voice Channels", value: `${channels.filter(c => c.type === ChannelType.GuildVoice).size}`, inline: true },
          { name: "Boosts", value: `${g.premiumSubscriptionCount ?? 0} (Tier ${g.premiumTier})`, inline: true },
        )
        .setFooter({ text: `ID: ${g.id}` })
        .setTimestamp(g.createdAt);
      await message.reply({ embeds: [embed] });
      break;
    }

    case "avatar": {
      const target = message.mentions.users.first() ?? message.author;
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${target.tag}'s Avatar`)
        .setImage(target.displayAvatarURL({ size: 4096 }))
        .addFields({ name: "Links", value: `[PNG](${target.displayAvatarURL({ extension: "png", size: 4096 })}) | [WEBP](${target.displayAvatarURL({ extension: "webp", size: 4096 })})` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    /* ─── FUN ────────────────────────────────────────────────── */

    case "meme": {
      const post = await fetchMeme();
      if (!post) { await message.reply("❌ Couldn't fetch a meme right now, try again!"); return; }
      const embed = new EmbedBuilder()
        .setColor(0xff4500)
        .setTitle(post.title.slice(0, 256))
        .setURL(post.postLink)
        .setImage(post.url)
        .setFooter({ text: `👍 ${post.ups.toLocaleString()} • r/${post.subreddit}` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "joke": {
      try {
        const res = await fetch("https://official-joke-api.appspot.com/random_joke");
        const joke = await res.json() as { setup: string; punchline: string };
        const embed = new EmbedBuilder()
          .setColor(0xf1c40f)
          .setTitle("😄 Random Joke")
          .addFields(
            { name: "Setup", value: joke.setup },
            { name: "Punchline", value: `||${joke.punchline}||` },
          )
          .setFooter({ text: "Hover/click to reveal punchline" })
          .setTimestamp();
        await message.reply({ embeds: [embed] });
      } catch { await message.reply("❌ Couldn't fetch a joke right now."); }
      break;
    }

    case "roast": {
      const target = message.mentions.users.first();
      if (!target) { await message.reply(`Usage: \`${prefix}roast @user\``); return; }
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setTitle("🔥 Roasted!")
        .setDescription(`<@${target.id}>, ${rand(ROASTS)}`)
        .setFooter({ text: `Requested by ${message.author.tag}` })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "flip": {
      const result = Math.random() < 0.5 ? "🪙 Heads." : "🪙 Tails.";
      await message.reply(`<@${message.author.id}> ${result}`);
      break;
    }

    case "choose": {
      const raw = args.join(" ");
      const choices = raw.split(",").map(s => s.trim()).filter(Boolean);
      if (choices.length < 2) { await message.reply(`Usage: \`${prefix}choose option1, option2, option3\``); return; }
      const picked = rand(choices);
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setTitle("🎲 I choose…")
        .setDescription(`**${picked}**`)
        .addFields({ name: "Options", value: choices.map((c, i) => `${i + 1}. ${c}`).join("\n") })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "wouldyourather":
    case "wyr": {
      const [optionA, optionB] = rand(WYR_SCENARIOS);
      const embed = new EmbedBuilder()
        .setColor(0xe91e8c)
        .setTitle("🤔 Would You Rather…")
        .addFields(
          { name: "🅰️ Option A", value: optionA, inline: false },
          { name: "🅱️ Option B", value: optionB, inline: false },
        )
        .setFooter({ text: "React with 🅰️ or 🅱️" });
      const reply = await message.reply({ embeds: [embed] });
      await reply.react("🅰️").catch(() => null);
      await reply.react("🅱️").catch(() => null);
      break;
    }

    case "truthordare":
    case "tod": {
      const pick = args[0]?.toLowerCase();
      if (pick === "truth") {
        const embed = new EmbedBuilder()
          .setColor(0x3498db).setTitle("🤔 Truth").setDescription(rand(TRUTHS))
          .setFooter({ text: `Asked to ${message.author.username}` });
        await message.reply({ embeds: [embed] });
      } else if (pick === "dare") {
        const embed = new EmbedBuilder()
          .setColor(0xe74c3c).setTitle("🔥 Dare").setDescription(rand(DARES))
          .setFooter({ text: `Dared to ${message.author.username}` });
        await message.reply({ embeds: [embed] });
      } else {
        await message.reply(`Usage: \`${prefix}tod truth\` or \`${prefix}tod dare\``);
      }
      break;
    }

    /* ─── TRACKING ───────────────────────────────────────────── */

    case "messages": {
      const target = message.mentions.users.first() ?? message.author;
      const count = getMessageCount(guild.id, target.id);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${target.tag}'s Messages`)
        .setThumbnail(target.displayAvatarURL())
        .addFields({ name: "Messages Sent", value: `${count}`, inline: true })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }

    case "leaderboard": {
      const lb = getMessageLeaderboard(guild.id, 10);
      const embed = new EmbedBuilder()
        .setColor(0x3498db)
        .setTitle(`${guild.name} — Message Leaderboard`)
        .setTimestamp();
      if (lb.length === 0) {
        embed.setDescription("No message data yet.");
      } else {
        embed.setDescription(lb.map((e, i) => `**${i + 1}.** <@${e.userId}> — ${e.count} messages`).join("\n"));
      }
      await message.reply({ embeds: [embed] });
      break;
    }

    case "invites": {
      const target = message.mentions.users.first() ?? message.author;
      const record = getInviteRecord(guild.id, target.id);
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
      await message.reply({ embeds: [embed] });
      break;
    }

    case "inviteleaderboard": {
      const records = getAllInvites(guild.id)
        .map(r => ({ ...r, real: r.uses - r.left - r.fake }))
        .sort((a, b) => b.real - a.real)
        .slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle(`${guild.name} — Invite Leaderboard`)
        .setTimestamp();
      embed.setDescription(records.length === 0 ? "No invite data yet." : records.map((r, i) => `**${i + 1}.** <@${r.inviterId}> — ${r.real} real (${r.uses} total)`).join("\n"));
      await message.reply({ embeds: [embed] });
      break;
    }

    /* ─── UTILITY ────────────────────────────────────────────── */

    case "afk": {
      const afkMsg = args.join(" ") || "AFK";
      setAfk(guild.id, message.author.id, afkMsg);
      await message.reply(`💤 You are now AFK: **${afkMsg}**`);
      break;
    }

    case "timer": {
      const durationStr = args[0];
      if (!durationStr) { await message.reply(`Usage: \`${prefix}timer <duration> [message]\` (e.g. \`${prefix}timer 10m\`)`); return; }
      const raw = parseDuration(durationStr);
      if (!raw) { await message.reply("❌ Invalid duration. Examples: `30s`, `5m`, `2h` (max 24h)."); return; }
      const ms = Math.min(raw, MAX_TIMER_MS);
      const expiresAt = Math.floor((Date.now() + ms) / 1000);
      const note = args.slice(1).join(" ");
      await message.reply(`⏰ Timer set for **${formatDuration(ms)}** — I'll ping you <t:${expiresAt}:R>.`);
      setTimeout(async () => {
        const extra = note ? `\n> ${note}` : "";
        await message.channel.send(`⏰ <@${message.author.id}> Your **${formatDuration(ms)}** timer is up!${extra}`).catch(() => null);
      }, ms);
      break;
    }

    case "snipe": {
      const channelId = message.channelId;
      const numBack = parseInt(args[0] ?? "1") || 1;
      const msg = getDeletedMessage(channelId, numBack - 1);
      if (!msg) { await message.reply(`No deleted message found at position #${numBack} in this channel.`); return; }
      const embed = new EmbedBuilder()
        .setColor(0xe74c3c)
        .setAuthor({ name: msg.authorTag, iconURL: msg.authorAvatar ?? undefined })
        .setDescription(msg.content || "*No text content*")
        .setFooter({ text: `Deleted • #${numBack}` })
        .setTimestamp(msg.deletedAt);
      if (msg.attachments.length > 0) embed.setImage(msg.attachments[0]);
      await message.reply({ embeds: [embed] });
      break;
    }

    case "esnipe": {
      const channelId = message.channelId;
      const numBack = parseInt(args[0] ?? "1") || 1;
      const msg = getEditedMessage(channelId, numBack - 1);
      if (!msg) { await message.reply(`No edited message found at position #${numBack} in this channel.`); return; }
      const embed = new EmbedBuilder()
        .setColor(0xf39c12)
        .setAuthor({ name: msg.authorTag, iconURL: msg.authorAvatar ?? undefined })
        .addFields({ name: "Before", value: msg.before || "*empty*" }, { name: "After", value: msg.after || "*empty*" })
        .setFooter({ text: `Edited • #${numBack}` })
        .setTimestamp(msg.editedAt);
      await message.reply({ embeds: [embed] });
      break;
    }

    case "rsnipe": {
      const channelId = message.channelId;
      const numBack = parseInt(args[0] ?? "1") || 1;
      const r = getRemovedReaction(channelId, numBack - 1);
      if (!r) { await message.reply(`No removed reaction found at position #${numBack} in this channel.`); return; }
      const embed = new EmbedBuilder()
        .setColor(0x9b59b6)
        .setDescription(`<@${r.userId}> removed ${r.emoji} from [a message](https://discord.com/channels/${guild.id}/${r.channelId}/${r.messageId})`)
        .setFooter({ text: `Removed reaction • #${numBack}` })
        .setTimestamp(r.removedAt);
      await message.reply({ embeds: [embed] });
      break;
    }

    case "say": {
      if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
        await message.reply("❌ You need the **Manage Messages** permission."); return;
      }
      const targetChannel = message.mentions.channels.first() as TextChannel | undefined;
      if (!targetChannel) { await message.reply(`Usage: \`${prefix}say #channel <text>\``); return; }
      const text = args.slice(1).join(" ");
      if (!text) { await message.reply(`Usage: \`${prefix}say #channel <text>\``); return; }
      await targetChannel.send(text).catch(() => message.reply("❌ I couldn't send to that channel."));
      await message.reply(`✅ Message sent to ${targetChannel}.`);
      break;
    }

    case "poll": {
      const raw = args.join(" ");
      const parts = raw.split("|").map(s => s.trim()).filter(Boolean);
      if (parts.length < 3) {
        await message.reply(`Usage: \`${prefix}poll question | option1 | option2 | ...\``); return;
      }
      const [question, ...options] = parts;
      if (options.length < 2) { await message.reply("Please provide at least 2 options."); return; }
      const capped = options.slice(0, 10);
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📊 " + question)
        .setDescription(capped.map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`).join("\n\n"))
        .setFooter({ text: `Poll by ${message.author.tag} • React to vote!` })
        .setTimestamp();
      const reply = await message.reply({ embeds: [embed] });
      for (let i = 0; i < capped.length; i++) {
        await reply.react(NUMBER_EMOJIS[i]).catch(() => null);
      }
      break;
    }

    case "role": {
      if (!executor.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await message.reply("❌ You need the **Manage Roles** permission."); return;
      }
      const sub = args[0]?.toLowerCase();
      switch (sub) {
        case "add": {
          const target = message.mentions.members?.first();
          const role = message.mentions.roles.first();
          if (!target || !role) { await message.reply(`Usage: \`${prefix}role add @user @role\``); return; }
          await target.roles.add(role, `Added by ${executor.user.tag}`);
          await message.reply(`✅ Added **${role.name}** to <@${target.id}>.`);
          break;
        }
        case "remove": {
          const target = message.mentions.members?.first();
          const role = message.mentions.roles.first();
          if (!target || !role) { await message.reply(`Usage: \`${prefix}role remove @user @role\``); return; }
          await target.roles.remove(role, `Removed by ${executor.user.tag}`);
          await message.reply(`✅ Removed **${role.name}** from <@${target.id}>.`);
          break;
        }
        case "list": {
          await guild.roles.fetch();
          const roles = [...guild.roles.cache.values()].filter(r => r.id !== guild.id).sort((a, b) => b.position - a.position);
          let desc = "";
          for (const r of roles) {
            const line = `${r} — \`${r.members.size} members\`\n`;
            if ((desc + line).length > 3900) { desc += "*...and more*"; break; }
            desc += line;
          }
          await message.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`📋 Roles in ${guild.name} (${roles.length})`).setDescription(desc || "No roles.")] });
          break;
        }
        case "create": {
          const parts = args.slice(1);
          const colorArg = parts.find(p => /^#?[0-9a-fA-F]{6}$/.test(p));
          const roleName = parts.filter(p => p !== colorArg).join(" ");
          if (!roleName) { await message.reply(`Usage: \`${prefix}role create <name> [#hexcolor]\``); return; }
          const color = colorArg ? parseInt(colorArg.replace("#", ""), 16) : undefined;
          const created = await guild.roles.create({ name: roleName, ...(color !== undefined ? { color } : {}), reason: `Created by ${executor.user.tag}` });
          const colorStr = colorArg ? ` with color \`${colorArg.startsWith("#") ? colorArg.toUpperCase() : "#" + colorArg.toUpperCase()}\`` : "";
          await message.reply(`✅ Role ${created} created${colorStr}.`);
          break;
        }
        case "delete": {
          const role = message.mentions.roles.first();
          if (!role) { await message.reply(`Usage: \`${prefix}role delete @role\``); return; }
          const name = role.name;
          await role.delete(`Deleted by ${executor.user.tag}`);
          await message.reply(`🗑️ Role **${name}** deleted.`);
          break;
        }
        case "clear": {
          const target = message.mentions.members?.first();
          if (!target) { await message.reply(`Usage: \`${prefix}role clear @user\``); return; }
          const removable = target.roles.cache.filter(r => r.id !== guild.id && r.editable);
          if (removable.size === 0) { await message.reply(`<@${target.id}> has no removable roles.`); return; }
          await target.roles.remove([...removable.keys()], `Cleared by ${executor.user.tag}`);
          await message.reply(`🧹 Removed **${removable.size}** role${removable.size !== 1 ? "s" : ""} from <@${target.id}>.`);
          break;
        }
        case "edit": {
          const role = message.mentions.roles.first();
          if (!role) { await message.reply(`Usage: \`${prefix}role edit @role [name:<new_name>] [color:<#hex>]\``); return; }
          if (!role.editable) { await message.reply("❌ I can't edit that role (it's above me in the hierarchy)."); return; }
          const rest = args.slice(1).filter(a => !a.startsWith("<@&")).join(" ");
          const nameMatch = rest.match(/name:(.+?)(?:\s+color:|$)/i);
          const colorMatch = rest.match(/color:(#?[0-9a-fA-F]{6})/i);
          if (!nameMatch && !colorMatch) {
            await message.reply(`Usage: \`${prefix}role edit @role [name:<new_name>] [color:<#hex>]\``); return;
          }
          const updates: { name?: string; color?: number } = {};
          if (nameMatch) updates.name = nameMatch[1].trim();
          if (colorMatch) updates.color = parseInt(colorMatch[1].replace("#", ""), 16);
          await role.edit({ ...updates, reason: `Edited by ${executor.user.tag}` });
          const changes: string[] = [];
          if (nameMatch) changes.push(`Name → **${updates.name}**`);
          if (colorMatch) changes.push(`Color → \`${colorMatch[1].startsWith("#") ? colorMatch[1].toUpperCase() : "#" + colorMatch[1].toUpperCase()}\``);
          await message.reply({ embeds: [new EmbedBuilder().setColor(role.color || 0x5865f2).setTitle(`✏️ Role Edited — ${role.name}`).setDescription(changes.join("\n"))] });
          break;
        }

        case "info": {
          const role = message.mentions.roles.first();
          if (!role) { await message.reply(`Usage: \`${prefix}role info @role\``); return; }
          await guild.members.fetch().catch(() => null);
          const memberCount = role.members.size;
          const createdAt = Math.floor(role.createdTimestamp / 1000);
          const colorStr = role.color ? `#${role.color.toString(16).padStart(6, "0").toUpperCase()}` : "None";
          const embed = new EmbedBuilder()
            .setColor(role.color || 0x5865f2)
            .setTitle(`🔍 Role Info — ${role.name}`)
            .addFields(
              { name: "ID", value: role.id, inline: true },
              { name: "Color", value: colorStr, inline: true },
              { name: "Position", value: `${role.position}`, inline: true },
              { name: "Members", value: `${memberCount}`, inline: true },
              { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
              { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true },
              { name: "Created", value: `<t:${createdAt}:D> (<t:${createdAt}:R>)`, inline: false },
            );
          await message.reply({ embeds: [embed] });
          break;
        }
        default:
          await message.reply(`Available: \`${prefix}role add\`, \`remove\`, \`list\`, \`create\`, \`delete\`, \`clear\`, \`info\`, \`edit\``);
      }
      break;
    }

    case "prefix": {
      if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
        await message.reply("❌ You need the **Manage Server** permission."); return;
      }
      const sub = args[0]?.toLowerCase();
      const newPrefix = args[1];
      if (sub !== "set" || !newPrefix) { await message.reply(`Usage: \`${prefix}prefix set <new_prefix>\``); return; }
      if (newPrefix.length > 5) { await message.reply("❌ Prefix must be 5 characters or fewer."); return; }
      setPrefix(guild.id, newPrefix);
      await message.reply(`✅ Prefix updated to \`${newPrefix}\`.`);
      break;
    }

    case "help": {
      const embed = new EmbedBuilder()
        .setColor(0x5865f2)
        .setTitle("📖 Prefix Commands Help")
        .setDescription(`All prefix commands use \`${prefix}\` as the prefix.`)
        .addFields(
          { name: "🔨 Moderation", value: `\`ban\`, \`unban\`, \`kick\`, \`mute\`, \`unmute\`, \`purge\`, \`warn\`, \`warnings\``, inline: false },
          { name: "📊 Info", value: `\`userinfo\`, \`membercount\`, \`serverinfo\`, \`avatar\``, inline: false },
          { name: "🎮 Fun", value: `\`meme\`, \`joke\`, \`roast\`, \`flip\`, \`choose\`, \`wyr\`, \`tod truth/dare\``, inline: false },
          { name: "📈 Tracking", value: `\`messages\`, \`leaderboard\`, \`invites\`, \`inviteleaderboard\``, inline: false },
          { name: "🛠️ Utility", value: `\`afk\`, \`timer\`, \`snipe\`, \`esnipe\`, \`rsnipe\`, \`say\`, \`poll\`, \`prefix\`, \`help\``, inline: false },
          { name: "🎭 Roles", value: `\`role add/remove/list/create/delete/clear/info/edit\``, inline: false },
        )
        .setFooter({ text: "Use /help for slash command help" })
        .setTimestamp();
      await message.reply({ embeds: [embed] });
      break;
    }
  }
}
