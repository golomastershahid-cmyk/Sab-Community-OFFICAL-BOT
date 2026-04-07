import app from "./app.js";
import { logger } from "./lib/logger.js";
import {
  Client, GatewayIntentBits, Partials, Events,
  ChatInputCommandInteraction, Message, ButtonInteraction,
  ModalSubmitInteraction, Routes,
} from "discord.js";
import { deployCommands } from "./deploy-commands.js";
import { handleBan } from "./commands/slash/ban.js";
import { handleUnban } from "./commands/slash/unban.js";
import { handlePurge } from "./commands/slash/purge.js";
import { handleWarn } from "./commands/slash/warn.js";
import { handleWarnings } from "./commands/slash/warnings.js";
import { handleKickSlash, handleKick } from "./commands/slash/kick.js";
import { handleMuteSlash, handleMute } from "./commands/slash/mute.js";
import { handleUnmuteSlash, handleUnmute } from "./commands/slash/unmute.js";
import { handleJail, handleUnjail, resumeActiveJails } from "./commands/slash/jail.js";
import { handleGiveaway, handleGiveawayButton, resumeActiveGiveaways } from "./commands/slash/giveaway.js";
import { handleUserInfo } from "./commands/slash/userinfo.js";
import { handleMemberCount } from "./commands/slash/membercount.js";
import { handleMeme } from "./commands/slash/meme.js";
import { handleJoke } from "./commands/slash/joke.js";
import { handleAvatar } from "./commands/slash/avatar.js";
import { handleRoast } from "./commands/slash/roast.js";
import { handleInviteLink, handleInvites, handleInvited, handleInviteLeaderboard, handleInviteReset } from "./commands/slash/invites.js";
import { cacheAllGuildInvites, cacheGuildInvites, handleMemberJoin, handleMemberLeave, onInviteCreate, onInviteDelete } from "./invite-tracker.js";
import { handleMessages, handleMessageLeaderboard, handleMessageReset } from "./commands/slash/messages.js";
import { incrementMessage } from "./message-storage.js";
import {
  handleTicketSetup, handleTicketClose, handleTicketAdd, handleTicketRemove,
  handleCreateTicketButton, handleCloseTicketButton, handleOpenTicketButton,
  handleDeleteTicketButton, handleTranscriptButton, handleTicketReasonModal,
} from "./commands/slash/ticket.js";
import { handleServerInfo, handleServerInfoRolesButton } from "./commands/slash/serverinfo.js";
import { handleTimer } from "./commands/slash/timer.js";
import { handleAfkSet, handleAfkStatus } from "./commands/slash/afk.js";
import { getAfk, removeAfk } from "./afk-storage.js";
import { handleFlipChallenge } from "./commands/slash/flip.js";
import { handleChoose } from "./commands/slash/choose.js";
import { handleWouldYouRather } from "./commands/slash/wouldyourather.js";
import { handleTruthOrDare, handleTodButton } from "./commands/slash/truthordare.js";
import { handleSnipe, handleEsnipe, handleRsnipe } from "./commands/slash/snipe.js";
import { storeDeletedMessage, storeEditedMessage, storeRemovedReaction } from "./snipe-storage.js";
import { handleRole } from "./commands/slash/role.js";
import { handleHelp } from "./commands/slash/help.js";
import { handleSay } from "./commands/slash/say.js";
import { handlePoll } from "./commands/slash/poll.js";
import { handlePrefix } from "./commands/slash/prefix.js";
import { getPrefix } from "./prefix-storage.js";
import { handlePrefixCommand } from "./prefix-commands.js";

async function startBot(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  if (!token) { logger.warn("DISCORD_TOKEN not set — bot will not start"); return; }

  await deployCommands();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites,
      GatewayIntentBits.MessageContent, GatewayIntentBits.GuildModeration,
      GatewayIntentBits.GuildMessageReactions,
      // GuildPresences removed — floods the event loop with status updates,
      // which delays interaction responses past Discord's 3-second window.
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
    rest: { retries: 1, timeout: 8000 },
  });

  client.once(Events.ClientReady, async (c) => {
    logger.info({ tag: c.user.tag }, "Discord bot logged in");
    // Pre-warm the REST connection so the first interaction reply is fast
    await c.rest.get(Routes.user()).catch(() => null);
    logger.info("REST connection warmed up");
    resumeActiveGiveaways(client);
    resumeActiveJails(client);
    await cacheAllGuildInvites(client);
  });

  client.on(Events.GuildCreate, async (guild) => { await cacheGuildInvites(guild); });
  client.on(Events.InviteCreate, (invite) => { onInviteCreate(invite); });
  client.on(Events.InviteDelete, (invite) => { onInviteDelete(invite); });
  client.on(Events.GuildMemberAdd, async (member) => { await handleMemberJoin(member); });
  client.on(Events.GuildMemberRemove, async (member) => { await handleMemberLeave(member); });

  client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isModalSubmit()) {
      const modal = interaction as ModalSubmitInteraction;
      if (modal.customId === "ticket_reason_modal") {
        await handleTicketReasonModal(modal, client).catch((err) => {
          logger.error({ err }, "Error handling ticket reason modal");
          modal.editReply({ content: "An error occurred creating your ticket." }).catch(() => null);
        });
      }
      return;
    }

    if (interaction.isButton()) {
      const btn = interaction as ButtonInteraction;
      if (btn.customId === "giveaway_enter") {
        await handleGiveawayButton(btn).catch(() => null);
      } else if (btn.customId === "tod_truth" || btn.customId === "tod_dare") {
        await handleTodButton(btn).catch((err) => logger.error({ err }, "Error handling tod button"));
      } else if (btn.customId.startsWith("serverinfo_roles:")) {
        await handleServerInfoRolesButton(btn).catch((err) => logger.error({ err }, "Error handling serverinfo_roles button"));
      } else if (btn.customId === "ticket_create") {
        await handleCreateTicketButton(btn, client).catch((err) => {
          logger.error({ err }, "Error handling ticket_create button");
          btn.reply({ content: "An error occurred creating your ticket.", flags: 64 }).catch(() => null);
        });
      } else if (btn.customId.startsWith("ticket_close:")) {
        await handleCloseTicketButton(btn, btn.customId.split(":")[1], client).catch((err) => logger.error({ err }, "Error handling ticket_close button"));
      } else if (btn.customId.startsWith("ticket_open:")) {
        await handleOpenTicketButton(btn, btn.customId.split(":")[1]).catch((err) => logger.error({ err }, "Error handling ticket_open button"));
      } else if (btn.customId.startsWith("ticket_delete:")) {
        await handleDeleteTicketButton(btn, btn.customId.split(":")[1]).catch((err) => logger.error({ err }, "Error handling ticket_delete button"));
      } else if (btn.customId.startsWith("ticket_transcript:")) {
        await handleTranscriptButton(btn, btn.customId.split(":")[1]).catch((err) => logger.error({ err }, "Error handling ticket_transcript button"));
      }
      return;
    }

    if (!interaction.isChatInputCommand()) return;
    const cmd = interaction as ChatInputCommandInteraction;
    try {
      switch (cmd.commandName) {
        case "ban": await handleBan(cmd); break;
        case "unban": await handleUnban(cmd); break;
        case "kick": await handleKickSlash(cmd); break;
        case "mute": await handleMuteSlash(cmd); break;
        case "unmute": await handleUnmuteSlash(cmd); break;
        case "jail": await handleJail(cmd, client); break;
        case "unjail": await handleUnjail(cmd, client); break;
        case "purge": await handlePurge(cmd); break;
        case "warn": await handleWarn(cmd); break;
        case "warnings": await handleWarnings(cmd); break;
        case "userinfo": await handleUserInfo(cmd); break;
        case "membercount": await handleMemberCount(cmd); break;
        case "meme": await handleMeme(cmd); break;
        case "joke": await handleJoke(cmd); break;
        case "avatar": await handleAvatar(cmd); break;
        case "roast": await handleRoast(cmd); break;
        case "invite": await handleInviteLink(cmd); break;
        case "invites": await handleInvites(cmd); break;
        case "invited": await handleInvited(cmd); break;
        case "inviteleaderboard": await handleInviteLeaderboard(cmd); break;
        case "invitereset": await handleInviteReset(cmd); break;
        case "messages": await handleMessages(cmd); break;
        case "leaderboard": await handleMessageLeaderboard(cmd); break;
        case "messagereset": await handleMessageReset(cmd); break;
        case "flip": await handleFlipChallenge(cmd); break;
        case "choose": await handleChoose(cmd); break;
        case "wouldyourather": await handleWouldYouRather(cmd); break;
        case "truthordare": await handleTruthOrDare(cmd); break;
        case "afk":
          switch (cmd.options.getSubcommand()) {
            case "set": await handleAfkSet(cmd); break;
            case "status": await handleAfkStatus(cmd); break;
          }
          break;
        case "serverinfo": await handleServerInfo(cmd); break;
        case "snipe": await handleSnipe(cmd); break;
        case "esnipe": await handleEsnipe(cmd); break;
        case "rsnipe": await handleRsnipe(cmd); break;
        case "role": await handleRole(cmd); break;
        case "help": await handleHelp(cmd); break;
        case "say": await handleSay(cmd); break;
        case "poll": await handlePoll(cmd); break;
        case "prefix":
          switch (cmd.options.getSubcommand()) {
            case "set": await handlePrefix(cmd); break;
          }
          break;
        case "timer": await handleTimer(cmd); break;
        case "giveaway": await handleGiveaway(cmd, client); break;
        case "ticket":
          switch (cmd.options.getSubcommand()) {
            case "setup": await handleTicketSetup(cmd); break;
            case "close": await handleTicketClose(cmd); break;
            case "add": await handleTicketAdd(cmd); break;
            case "remove": await handleTicketRemove(cmd); break;
          }
          break;
      }
    } catch (err) {
      logger.error({ err, command: cmd.commandName }, "Error handling slash command");
      const msg = { content: "An error occurred.", flags: 64 };
      if (cmd.replied || cmd.deferred) await cmd.followUp(msg).catch(() => undefined);
      else await cmd.reply(msg).catch(() => undefined);
    }
  });

  client.on(Events.MessageCreate, async (message: Message) => {
    if (message.author.bot) return;
    if (message.guild) {
      incrementMessage(message.guild.id, message.author.id);

      const afkEntry = getAfk(message.guild.id, message.author.id);
      if (afkEntry) {
        removeAfk(message.guild.id, message.author.id);
        const setAt = Math.floor(new Date(afkEntry.setAt).getTime() / 1000);
        message.reply({ content: `👋 Welcome back <@${message.author.id}>! Your AFK has been removed (set <t:${setAt}:R>).` }).catch(() => null);
      }

      if (message.mentions.users.size > 0) {
        const notifications: string[] = [];
        for (const [, mentionedUser] of message.mentions.users) {
          if (mentionedUser.bot) continue;
          const entry = getAfk(message.guild.id, mentionedUser.id);
          if (entry) {
            const setAt = Math.floor(new Date(entry.setAt).getTime() / 1000);
            notifications.push(`💤 **${mentionedUser.username}** is AFK: ${entry.message} (since <t:${setAt}:R>)`);
          }
        }
        if (notifications.length > 0) message.reply({ content: notifications.join("\n") }).catch(() => null);
      }
    }
    const PREFIX = message.guild ? getPrefix(message.guild.id) : "!";
    if (!message.content.startsWith(PREFIX)) return;
    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const command = args.shift()?.toLowerCase();
    if (!command) return;
    try {
      await handlePrefixCommand(message, command, args);
    } catch (err) {
      logger.error({ err, command }, "Error handling prefix command");
      await message.reply("An error occurred.").catch(() => undefined);
    }
  });

  client.on(Events.MessageDelete, (message) => {
    if (!message.guild || message.author?.bot) return;
    storeDeletedMessage({
      authorId: message.author?.id ?? "unknown",
      authorTag: message.author?.tag ?? "Unknown User",
      authorAvatar: message.author?.displayAvatarURL() ?? null,
      content: message.content ?? "",
      attachments: [...(message.attachments?.values() ?? [])].map(a => a.url),
      deletedAt: new Date(),
      channelId: message.channelId,
    });
  });

  client.on(Events.MessageUpdate, (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    storeEditedMessage({
      authorId: newMessage.author?.id ?? "unknown",
      authorTag: newMessage.author?.tag ?? "Unknown User",
      authorAvatar: newMessage.author?.displayAvatarURL() ?? null,
      before: oldMessage.content ?? "",
      after: newMessage.content ?? "",
      editedAt: new Date(),
      channelId: newMessage.channelId,
      messageUrl: newMessage.url,
    });
  });

  client.on(Events.MessageReactionRemove, async (reaction, user) => {
    if (user.bot) return;
    const fullReaction = reaction.partial ? await reaction.fetch().catch(() => null) : reaction;
    if (!fullReaction) return;
    storeRemovedReaction({
      userId: user.id,
      userTag: user.tag,
      emoji: fullReaction.emoji.toString(),
      messageId: fullReaction.message.id,
      channelId: fullReaction.message.channelId,
      removedAt: new Date(),
    });
  });

  await client.login(token);
}

const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

app.listen(port, (err) => {
  if (err) { logger.error({ err }, "Error listening on port"); process.exit(1); }
  logger.info({ port }, "Server listening");
});

void startBot();
