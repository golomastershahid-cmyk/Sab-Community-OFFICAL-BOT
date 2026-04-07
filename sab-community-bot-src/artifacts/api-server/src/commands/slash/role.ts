import {
  ChatInputCommandInteraction, EmbedBuilder, MessageFlags, Role,
} from "discord.js";

function hexToNumber(hex: string): number {
  const clean = hex.replace(/^#/, "");
  const n = parseInt(clean, 16);
  return isNaN(n) ? 0x99aab5 : n;
}

function formatPermissions(role: Role): string {
  const perms = role.permissions.toArray();
  if (perms.length === 0) return "None";
  const friendly: Record<string, string> = {
    Administrator: "Administrator",
    ManageGuild: "Manage Server",
    ManageRoles: "Manage Roles",
    ManageChannels: "Manage Channels",
    KickMembers: "Kick Members",
    BanMembers: "Ban Members",
    ManageMessages: "Manage Messages",
    MentionEveryone: "Mention Everyone",
    ViewAuditLog: "View Audit Log",
    ModerateMembers: "Timeout Members",
    SendMessages: "Send Messages",
    ReadMessageHistory: "Read Message History",
    AttachFiles: "Attach Files",
    EmbedLinks: "Embed Links",
    UseExternalEmojis: "Use External Emojis",
    AddReactions: "Add Reactions",
    Connect: "Connect (Voice)",
    Speak: "Speak (Voice)",
    MoveMembers: "Move Members",
    MuteMembers: "Mute Members",
    DeafenMembers: "Deafen Members",
  };
  const mapped = perms.map(p => friendly[p] ?? p);
  if (mapped.length > 15) return mapped.slice(0, 15).join(", ") + ` (+${mapped.length - 15} more)`;
  return mapped.join(", ");
}

export async function handleRole(interaction: ChatInputCommandInteraction): Promise<void> {
  const sub = interaction.options.getSubcommand();
  const guild = interaction.guild!;

  switch (sub) {
    case "create": {
      const roleName = interaction.options.getString("role_name", true);
      const colorHex = interaction.options.getString("color_hex") ?? "#99aab5";
      const color = hexToNumber(colorHex);

      const created = await guild.roles.create({ name: roleName, color, reason: `Created by ${interaction.user.tag}` });
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(color)
          .setDescription(`✅ Role ${created} created with color \`${colorHex.startsWith("#") ? colorHex : "#" + colorHex}\`.`)],
      });
      break;
    }

    case "add": {
      const user = interaction.options.getUser("user", true);
      const role = interaction.options.getRole("role", true) as Role;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) { await interaction.reply({ content: "❌ Member not found.", flags: MessageFlags.Ephemeral }); return; }

      await member.roles.add(role, `Added by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(role.color || 0x57f287)
          .setDescription(`✅ Added ${role} to <@${user.id}>.`)],
      });
      break;
    }

    case "remove": {
      const user = interaction.options.getUser("user", true);
      const role = interaction.options.getRole("role", true) as Role;

      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) { await interaction.reply({ content: "❌ Member not found.", flags: MessageFlags.Ephemeral }); return; }

      await member.roles.remove(role, `Removed by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`✅ Removed ${role} from <@${user.id}>.`)],
      });
      break;
    }

    case "delete": {
      const role = interaction.options.getRole("role", true) as Role;
      const name = role.name;
      await role.delete(`Deleted by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xed4245)
          .setDescription(`🗑️ Role **${name}** has been deleted.`)],
      });
      break;
    }

    case "list": {
      await guild.roles.fetch();
      const roles = [...guild.roles.cache.values()]
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position);

      if (roles.length === 0) { await interaction.reply({ content: "This server has no roles.", flags: MessageFlags.Ephemeral }); return; }

      let description = "";
      for (const r of roles) {
        const line = `${r} — \`${r.members.size} member${r.members.size !== 1 ? "s" : ""}\`\n`;
        if ((description + line).length > 3900) { description += `\n*...and more*`; break; }
        description += line;
      }

      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0x5865f2)
          .setTitle(`📋 Roles in ${guild.name} (${roles.length})`)
          .setDescription(description)],
      });
      break;
    }

    case "info": {
      const role = interaction.options.getRole("role", true) as Role;
      await guild.members.fetch();
      const memberCount = role.members.size;
      const createdAt = Math.floor(role.createdTimestamp / 1000);
      const permsText = formatPermissions(role);
      const colorStr = role.color ? `#${role.color.toString(16).padStart(6, "0").toUpperCase()}` : "None";

      await interaction.reply({
        embeds: [new EmbedBuilder()
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
            { name: "Permissions", value: permsText || "None", inline: false },
          )],
      });
      break;
    }

    case "edit": {
      const role = interaction.options.getRole("role", true) as Role;
      const newName = interaction.options.getString("name");
      const colorHex = interaction.options.getString("color");
      if (!newName && !colorHex) {
        await interaction.reply({ content: "❌ Provide at least a new `name` or `color`.", flags: MessageFlags.Ephemeral }); return;
      }
      if (!role.editable) {
        await interaction.reply({ content: "❌ I can't edit that role (it's above me in the hierarchy).", flags: MessageFlags.Ephemeral }); return;
      }
      const updates: { name?: string; color?: number } = {};
      if (newName) updates.name = newName;
      if (colorHex) {
        const n = hexToNumber(colorHex);
        updates.color = n;
      }
      await role.edit({ ...updates, reason: `Edited by ${interaction.user.tag}` });
      const changes: string[] = [];
      if (newName) changes.push(`Name → **${newName}**`);
      if (colorHex) changes.push(`Color → \`${colorHex.startsWith("#") ? colorHex.toUpperCase() : "#" + colorHex.toUpperCase()}\``);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(role.color || 0x5865f2)
          .setTitle(`✏️ Role Edited — ${role.name}`)
          .setDescription(changes.join("\n"))],
      });
      break;
    }

    case "clear": {
      const user = interaction.options.getUser("user", true);
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) { await interaction.reply({ content: "❌ Member not found.", flags: MessageFlags.Ephemeral }); return; }

      const removable = member.roles.cache.filter(r => r.id !== guild.id && r.editable);
      if (removable.size === 0) {
        await interaction.reply({ content: `<@${user.id}> has no removable roles.`, flags: MessageFlags.Ephemeral });
        return;
      }

      await member.roles.remove([...removable.keys()], `Roles cleared by ${interaction.user.tag}`);
      await interaction.reply({
        embeds: [new EmbedBuilder()
          .setColor(0xfee75c)
          .setDescription(`🧹 Removed **${removable.size}** role${removable.size !== 1 ? "s" : ""} from <@${user.id}>.`)],
      });
      break;
    }
  }
}
