import { ChatInputCommandInteraction, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, ComponentType, MessageFlags } from "discord.js";

const categories: Record<string, { emoji: string; description: string; commands: { name: string; desc: string }[] }> = {
  moderation: {
    emoji: "🔨",
    description: "Commands for moderating the server",
    commands: [
      { name: "/ban <@user>", desc: "Ban a member from the server" },
      { name: "/unban <user_id>", desc: "Unban a user by ID" },
      { name: "/kick <@user>", desc: "Kick a member from the server" },
      { name: "/mute <@user> [duration]", desc: "Timeout a member (e.g. 10m, 2h, 7d)" },
      { name: "/unmute <@user>", desc: "Remove a timeout from a member" },
      { name: "/warn <@user> <reason>", desc: "Issue a warning to a member" },
      { name: "/warnings <@user>", desc: "View all warnings for a member" },
      { name: "/purge <amount>", desc: "Bulk delete up to 100 messages" },
      { name: "/jail <@user> [duration]", desc: "Strip roles and lock member in jail" },
      { name: "/unjail <@user>", desc: "Release a jailed member and restore roles" },
    ],
  },
  roles: {
    emoji: "🎭",
    description: "Commands for managing roles",
    commands: [
      { name: "/role create <name> [color]", desc: "Create a new role with optional hex color" },
      { name: "/role add <@user> <@role>", desc: "Give a role to a member" },
      { name: "/role remove <@user> <@role>", desc: "Take a role away from a member" },
      { name: "/role delete <@role>", desc: "Permanently delete a role" },
      { name: "/role list", desc: "List all roles with member counts" },
      { name: "/role info <@role>", desc: "Show permissions, members, and creation date" },
      { name: "/role clear <@user>", desc: "Strip all removable roles from a member" },
      { name: "/role edit <@role> [name] [color]", desc: "Edit a role's name and/or hex color" },
    ],
  },
  info: {
    emoji: "📊",
    description: "Server and user information commands",
    commands: [
      { name: "/serverinfo", desc: "Detailed info about this server" },
      { name: "/userinfo [@user]", desc: "View info about yourself or another user" },
      { name: "/membercount", desc: "Show total member statistics" },
      { name: "/avatar [@user]", desc: "Display a user's profile picture" },
    ],
  },
  tracking: {
    emoji: "📈",
    description: "Message and invite tracking",
    commands: [
      { name: "/messages [@user]", desc: "Show message count for a user" },
      { name: "/leaderboard", desc: "Top 10 most active users" },
      { name: "/messagereset [@user]", desc: "Reset message count (admin)" },
      { name: "/invites [@user]", desc: "Show how many invites a user has" },
      { name: "/invited [@user]", desc: "List members invited by a user" },
      { name: "/inviteleaderboard", desc: "Top inviters in the server" },
      { name: "/invitereset [@user]", desc: "Reset invite counts (admin)" },
    ],
  },
  fun: {
    emoji: "🎮",
    description: "Fun and games commands",
    commands: [
      { name: "/flip", desc: "Flip a coin — Heads or Tails" },
      { name: "/choose <options>", desc: "Pick randomly from comma-separated choices" },
      { name: "/roast <@user>", desc: "Send a funny roast at someone" },
      { name: "/joke", desc: "Get a random joke" },
      { name: "/meme", desc: "Fetch a random meme from Reddit" },
      { name: "/wouldyourather", desc: "Get a random Would You Rather scenario" },
      { name: "/truthordare", desc: "Pick Truth or Dare" },
    ],
  },
  snipe: {
    emoji: "🔫",
    description: "Snipe deleted and edited content",
    commands: [
      { name: "/snipe [num_back] [#channel]", desc: "Show a recently deleted message" },
      { name: "/esnipe [num_back] [#channel]", desc: "Show a recently edited message" },
      { name: "/rsnipe [num_back] [#channel]", desc: "Show a recently removed reaction" },
    ],
  },
  utility: {
    emoji: "🛠️",
    description: "Utility and convenience commands",
    commands: [
      { name: "/afk set [message]", desc: "Set your AFK status" },
      { name: "/afk status [@user]", desc: "Check who is AFK" },
      { name: "/timer <duration> [message]", desc: "Set a timer that pings you" },
      { name: "/invite", desc: "Get the bot's invite link" },
      { name: "/say <#channel> <text> [embed]", desc: "Send a message (or embed) to a channel" },
      { name: "/poll <question> <option1> <option2> [...]", desc: "Create a reaction poll with up to 10 options" },
      { name: "/prefix set <new_prefix>", desc: "Change the bot's prefix for this server (default: !)" },
    ],
  },
  giveaways: {
    emoji: "🎉",
    description: "Giveaway management",
    commands: [
      { name: "/giveaway create <duration> <winners> <prize>", desc: "Start a giveaway" },
      { name: "/giveaway end <message_id>", desc: "End a giveaway early" },
      { name: "/giveaway reroll <message_id>", desc: "Reroll the winners" },
    ],
  },
  tickets: {
    emoji: "🎫",
    description: "Ticket system",
    commands: [
      { name: "/ticket setup <#channel> <@role>", desc: "Set up the ticket panel" },
      { name: "/ticket close", desc: "Close the current ticket" },
      { name: "/ticket add <@user>", desc: "Add a user to the ticket" },
      { name: "/ticket remove <@user>", desc: "Remove a user from the ticket" },
    ],
  },
};

function buildOverviewEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📖 Sab Community — Help")
    .setDescription("Select a category from the menu below to see its commands.")
    .addFields(
      Object.entries(categories).map(([, cat]) => ({
        name: `${cat.emoji} ${cat.description.split(" ")[0]} ${cat.description.split(" ").slice(1).join(" ")}`,
        value: cat.commands.map(c => `\`${c.name.split(" ")[0]}\``).slice(0, 5).join("  ") + (cat.commands.length > 5 ? `  *+${cat.commands.length - 5} more*` : ""),
        inline: false,
      }))
    )
    .setFooter({ text: "Use the menu below to explore each category" });
}

function buildCategoryEmbed(key: string): EmbedBuilder {
  const cat = categories[key];
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${cat.emoji} ${cat.description}`)
    .setDescription(cat.commands.map(c => `\`${c.name}\`\n┗ ${c.desc}`).join("\n\n"))
    .setFooter({ text: "[ ] = required  ( ) = optional" });
}

function buildMenu(placeholder: string): ActionRowBuilder<StringSelectMenuBuilder> {
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId("help_category")
      .setPlaceholder(placeholder)
      .addOptions([
        { label: "Overview", description: "All categories at a glance", value: "overview", emoji: "📖" },
        ...Object.entries(categories).map(([key, cat]) => ({
          label: cat.description,
          description: `${cat.commands.length} commands`,
          value: key,
          emoji: cat.emoji,
        })),
      ])
  );
}

export async function handleHelp(interaction: ChatInputCommandInteraction): Promise<void> {
  const reply = await interaction.reply({
    embeds: [buildOverviewEmbed()],
    components: [buildMenu("Browse a category...")],
    fetchReply: true,
  });

  const collector = reply.createMessageComponentCollector({
    componentType: ComponentType.StringSelect,
    time: 120_000,
  });

  collector.on("collect", async (sel: StringSelectMenuInteraction) => {
    if (sel.user.id !== interaction.user.id) {
      await sel.reply({ content: "This menu is not for you.", flags: MessageFlags.Ephemeral });
      return;
    }
    const value = sel.values[0];
    if (value === "overview") {
      await sel.update({ embeds: [buildOverviewEmbed()], components: [buildMenu("Browse a category...")] });
    } else {
      await sel.update({ embeds: [buildCategoryEmbed(value)], components: [buildMenu(`Viewing: ${categories[value].description}`)] });
    }
  });

  collector.on("end", () => {
    interaction.editReply({ components: [] }).catch(() => null);
  });
}
