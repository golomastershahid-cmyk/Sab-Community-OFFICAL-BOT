import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { logger } from "./lib/logger.js";

export async function deployCommands(): Promise<void> {
  const token = process.env["DISCORD_TOKEN"];
  const clientId = process.env["DISCORD_CLIENT_ID"];
  if (!token || !clientId) { logger.warn("Missing bot credentials — skipping command registration"); return; }

  const commands = [
    new SlashCommandBuilder().setName("ban").setDescription("Ban a member from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to ban").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for the ban")),
    new SlashCommandBuilder().setName("unban").setDescription("Unban a user from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
      .addStringOption(opt => opt.setName("user").setDescription("User ID to unban").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for the unban")),
    new SlashCommandBuilder().setName("kick").setDescription("Kick a member from the server")
      .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to kick").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for the kick")),
    new SlashCommandBuilder().setName("mute").setDescription("Timeout (mute) a member for a given duration")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to mute").setRequired(true))
      .addStringOption(opt => opt.setName("duration").setDescription("Duration e.g. 10m, 2h, 1d, 7d, 1w (default: 28d max)"))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for the mute")),
    new SlashCommandBuilder().setName("unmute").setDescription("Remove a timeout from a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to unmute").setRequired(true)),
    new SlashCommandBuilder().setName("jail").setDescription("Jail a member — removes their roles and locks them to a jailed role")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption(opt => opt.setName("user").setDescription("The user to jail").setRequired(true))
      .addStringOption(opt => opt.setName("duration").setDescription("Duration e.g. 10m, 2h, 1d (leave blank for permanent)"))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for jailing")),
    new SlashCommandBuilder().setName("unjail").setDescription("Release a jailed member and restore their roles")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addUserOption(opt => opt.setName("user").setDescription("The user to unjail").setRequired(true)),
    new SlashCommandBuilder().setName("purge").setDescription("Delete a number of messages from this channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addIntegerOption(opt => opt.setName("amount").setDescription("Number of messages to delete (1–100)").setMinValue(1).setMaxValue(100).setRequired(true)),
    new SlashCommandBuilder().setName("warn").setDescription("Warn a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to warn").setRequired(true))
      .addStringOption(opt => opt.setName("reason").setDescription("Reason for the warning").setRequired(true)),
    new SlashCommandBuilder().setName("warnings").setDescription("Check warnings for a member")
      .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
      .addUserOption(opt => opt.setName("user").setDescription("The user to check").setRequired(true)),
    new SlashCommandBuilder().setName("userinfo").setDescription("View detailed information about a user")
      .addUserOption(opt => opt.setName("user").setDescription("The user to look up (defaults to yourself)")),
    new SlashCommandBuilder().setName("meme").setDescription("Sends a random meme from Reddit"),
    new SlashCommandBuilder().setName("joke").setDescription("Sends a random joke"),
    new SlashCommandBuilder().setName("avatar").setDescription("Shows a user's profile picture")
      .addUserOption(opt => opt.setName("user").setDescription("The user whose avatar to show (defaults to yourself)")),
    new SlashCommandBuilder().setName("roast").setDescription("Sends a funny roast targeting a user")
      .addUserOption(opt => opt.setName("user").setDescription("The user to roast").setRequired(true)),
    new SlashCommandBuilder().setName("membercount").setDescription("Shows member statistics for this server"),
    new SlashCommandBuilder().setName("invite").setDescription("Get the bot's invite link"),
    new SlashCommandBuilder().setName("invites").setDescription("Shows how many invites you or another user has")
      .addUserOption(opt => opt.setName("user").setDescription("The user to check (defaults to yourself)")),
    new SlashCommandBuilder().setName("invited").setDescription("Shows the members invited by you or another user")
      .addUserOption(opt => opt.setName("user").setDescription("The user to check (defaults to yourself)")),
    new SlashCommandBuilder().setName("inviteleaderboard").setDescription("Shows the top inviters in this server"),
    new SlashCommandBuilder().setName("invitereset").setDescription("Reset invites for a user or the entire server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption(opt => opt.setName("user").setDescription("User to reset (leave blank to reset all invites)")),
    new SlashCommandBuilder().setName("messages").setDescription("Show message count for a user")
      .addUserOption(opt => opt.setName("user").setDescription("The user to check (defaults to yourself)")),
    new SlashCommandBuilder().setName("leaderboard").setDescription("Show the top 10 most active users by message count"),
    new SlashCommandBuilder().setName("messagereset").setDescription("Reset message count for a user or the entire server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addUserOption(opt => opt.setName("user").setDescription("User to reset (leave blank to reset everyone)")),
    new SlashCommandBuilder().setName("giveaway").setDescription("Manage giveaways")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(sub => sub.setName("create").setDescription("Create a giveaway")
        .addStringOption(opt => opt.setName("duration").setDescription("Duration e.g. 1h, 30m, 1d").setRequired(true))
        .addIntegerOption(opt => opt.setName("winners").setDescription("Number of winners").setMinValue(1).setMaxValue(20).setRequired(true))
        .addStringOption(opt => opt.setName("prize").setDescription("The prize").setRequired(true))
        .addChannelOption(opt => opt.setName("channel").setDescription("Channel for the giveaway"))
        .addUserOption(opt => opt.setName("host").setDescription("Host of the giveaway"))
        .addStringOption(opt => opt.setName("giveaway-create-message").setDescription("Message to send after creating"))
        .addRoleOption(opt => opt.setName("giveaway-winners-role").setDescription("Role given to winners"))
        .addStringOption(opt => opt.setName("giveaway-winners-dm-message").setDescription("DM message for winners"))
        .addStringOption(opt => opt.setName("image").setDescription("Image URL for embed"))
        .addStringOption(opt => opt.setName("thumbnail").setDescription("Thumbnail URL for embed"))
        .addRoleOption(opt => opt.setName("required-role").setDescription("Role required to enter"))
        .addStringOption(opt => opt.setName("description").setDescription("Extra description text")))
      .addSubcommand(sub => sub.setName("end").setDescription("End a giveaway early")
        .addStringOption(opt => opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true)))
      .addSubcommand(sub => sub.setName("reroll").setDescription("Reroll the winners of an ended giveaway")
        .addStringOption(opt => opt.setName("message_id").setDescription("Message ID of the giveaway").setRequired(true))),
    new SlashCommandBuilder().setName("role").setDescription("Manage server roles")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
      .addSubcommand(sub => sub.setName("create").setDescription("Creates a new role")
        .addStringOption(opt => opt.setName("role_name").setDescription("Name of the new role").setRequired(true))
        .addStringOption(opt => opt.setName("color_hex").setDescription("Hex color e.g. #FF5733 (optional)")))
      .addSubcommand(sub => sub.setName("add").setDescription("Gives a role to a member")
        .addUserOption(opt => opt.setName("user").setDescription("The member to give the role to").setRequired(true))
        .addRoleOption(opt => opt.setName("role").setDescription("The role to give").setRequired(true)))
      .addSubcommand(sub => sub.setName("remove").setDescription("Removes a role from a member")
        .addUserOption(opt => opt.setName("user").setDescription("The member to remove the role from").setRequired(true))
        .addRoleOption(opt => opt.setName("role").setDescription("The role to remove").setRequired(true)))
      .addSubcommand(sub => sub.setName("delete").setDescription("Deletes a role from the server completely")
        .addRoleOption(opt => opt.setName("role").setDescription("The role to delete").setRequired(true)))
      .addSubcommand(sub => sub.setName("list").setDescription("Shows all roles in the server"))
      .addSubcommand(sub => sub.setName("info").setDescription("Shows info about a role")
        .addRoleOption(opt => opt.setName("role").setDescription("The role to look up").setRequired(true)))
      .addSubcommand(sub => sub.setName("clear").setDescription("Removes ALL roles from a member")
        .addUserOption(opt => opt.setName("user").setDescription("The member to strip all roles from").setRequired(true)))
      .addSubcommand(sub => sub.setName("edit").setDescription("Edit a role's name and/or color")
        .addRoleOption(opt => opt.setName("role").setDescription("The role to edit").setRequired(true))
        .addStringOption(opt => opt.setName("name").setDescription("New name for the role"))
        .addStringOption(opt => opt.setName("color").setDescription("New hex color e.g. #FF5733"))),
    new SlashCommandBuilder().setName("snipe").setDescription("Snipes recently deleted messages")
      .addIntegerOption(opt => opt.setName("num_back").setDescription("How many deleted messages back should I go?").setMinValue(1).setMaxValue(20))
      .addChannelOption(opt => opt.setName("channel").setDescription("Which channel should I snipe from? Defaults to current channel"))
      .addStringOption(opt => opt.setName("ephemeral").setDescription("Should the snipe be private? Defaults to False").addChoices(
        { name: "True", value: "true" },
        { name: "False", value: "false" },
      )),
    new SlashCommandBuilder().setName("esnipe").setDescription("Snipes recently edited messages")
      .addIntegerOption(opt => opt.setName("num_back").setDescription("How many edited messages back should I go?").setMinValue(1).setMaxValue(20))
      .addChannelOption(opt => opt.setName("channel").setDescription("Which channel should I snipe from? Defaults to current channel"))
      .addStringOption(opt => opt.setName("ephemeral").setDescription("Should the snipe be private? Defaults to False").addChoices(
        { name: "True", value: "true" },
        { name: "False", value: "false" },
      )),
    new SlashCommandBuilder().setName("rsnipe").setDescription("Snipes recently removed reactions")
      .addIntegerOption(opt => opt.setName("num_back").setDescription("How many removed reactions back should I go?").setMinValue(1).setMaxValue(20))
      .addChannelOption(opt => opt.setName("channel").setDescription("Which channel should I snipe from? Defaults to current channel"))
      .addStringOption(opt => opt.setName("ephemeral").setDescription("Should the snipe be private? Defaults to False").addChoices(
        { name: "True", value: "true" },
        { name: "False", value: "false" },
      )),
    new SlashCommandBuilder().setName("help").setDescription("Browse all bot commands by category"),
    new SlashCommandBuilder().setName("flip").setDescription("Flip a coin — Heads or Tails?"),
    new SlashCommandBuilder().setName("choose").setDescription("Picks randomly between your choices")
      .addStringOption(opt => opt.setName("options").setDescription("Comma-separated choices e.g. pizza, burger, sushi").setRequired(true)),
    new SlashCommandBuilder().setName("wouldyourather").setDescription("Get a random Would You Rather scenario"),
    new SlashCommandBuilder().setName("truthordare").setDescription("Pick Truth or Dare — get a question or a challenge"),
    new SlashCommandBuilder().setName("afk").setDescription("Manage your AFK status")
      .addSubcommand(sub => sub.setName("set").setDescription("Set your AFK status")
        .addStringOption(opt => opt.setName("message").setDescription("AFK message (e.g. 'Sleeping', 'Be back soon')")))
      .addSubcommand(sub => sub.setName("status").setDescription("Check AFK status — a user's, or all AFK members if no user given")
        .addUserOption(opt => opt.setName("user").setDescription("User to check (leave blank to see all AFK members)"))),
    new SlashCommandBuilder().setName("serverinfo").setDescription("Shows detailed information about this server"),
    new SlashCommandBuilder().setName("timer").setDescription("Set a timer that pings you when it expires")
      .addStringOption(opt => opt.setName("duration").setDescription("Duration e.g. 30s, 5m, 2h, 1d (max 24h)").setRequired(true))
      .addStringOption(opt => opt.setName("message").setDescription("Optional message to show when the timer fires"))
      .addStringOption(opt => opt.setName("private").setDescription("Only visible to you? (yes/no)").addChoices(
        { name: "yes", value: "yes" },
        { name: "no", value: "no" },
      )),
    new SlashCommandBuilder().setName("ticket").setDescription("Manage the ticket system")
      .addSubcommand(sub => sub.setName("setup").setDescription("Set up the ticket panel in a channel")
        .addChannelOption(opt => opt.setName("channel").setDescription("Channel to post the ticket panel in").setRequired(true))
        .addRoleOption(opt => opt.setName("support_role").setDescription("Role that can see and manage tickets").setRequired(true))
        .addChannelOption(opt => opt.setName("category").setDescription("Category to create ticket channels under"))
        .addChannelOption(opt => opt.setName("log_channel").setDescription("Channel to log ticket transcripts")))
      .addSubcommand(sub => sub.setName("close").setDescription("Close the current ticket"))
      .addSubcommand(sub => sub.setName("add").setDescription("Add a user to the current ticket")
        .addUserOption(opt => opt.setName("user").setDescription("User to add").setRequired(true)))
      .addSubcommand(sub => sub.setName("remove").setDescription("Remove a user from the current ticket")
        .addUserOption(opt => opt.setName("user").setDescription("User to remove").setRequired(true))),
    new SlashCommandBuilder().setName("say").setDescription("Send a message to a channel")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
      .addChannelOption(opt => opt.setName("channel").setDescription("The channel to send the message to").setRequired(true))
      .addStringOption(opt => opt.setName("text").setDescription("The message content").setRequired(true))
      .addBooleanOption(opt => opt.setName("embed").setDescription("Send as an embed? (default: false)")),
    new SlashCommandBuilder().setName("prefix").setDescription("Change the bot's command prefix for this server")
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand(sub => sub.setName("set").setDescription("Set a new prefix")
        .addStringOption(opt => opt.setName("new_prefix").setDescription("The new prefix (max 5 characters)").setRequired(true))),
    new SlashCommandBuilder().setName("poll").setDescription("Create a poll for members to vote on")
      .addStringOption(opt => opt.setName("question").setDescription("The poll question").setRequired(true))
      .addStringOption(opt => opt.setName("option1").setDescription("Option 1").setRequired(true))
      .addStringOption(opt => opt.setName("option2").setDescription("Option 2").setRequired(true))
      .addStringOption(opt => opt.setName("option3").setDescription("Option 3"))
      .addStringOption(opt => opt.setName("option4").setDescription("Option 4"))
      .addStringOption(opt => opt.setName("option5").setDescription("Option 5"))
      .addStringOption(opt => opt.setName("option6").setDescription("Option 6"))
      .addStringOption(opt => opt.setName("option7").setDescription("Option 7"))
      .addStringOption(opt => opt.setName("option8").setDescription("Option 8"))
      .addStringOption(opt => opt.setName("option9").setDescription("Option 9"))
      .addStringOption(opt => opt.setName("option10").setDescription("Option 10")),
  ].map(cmd => cmd.toJSON());

  const rest = new REST({ version: "10" }).setToken(token);
  const guildId = process.env["DISCORD_GUILD_ID"];
  try {
    if (guildId) {
      logger.info({ guildId }, "Registering slash commands to guild (instant)...");
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
      logger.info("Guild slash commands registered successfully");
    } else {
      logger.info("Registering slash commands globally...");
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
      logger.info("Global slash commands registered successfully");
    }
  } catch (err) {
    logger.error({ err }, "Failed to register slash commands");
  }
}
