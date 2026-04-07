import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits } from "discord.js";
import { setPrefix } from "../../prefix-storage.js";

export async function handlePrefix(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageGuild)) {
    await interaction.reply({ content: "You need the **Manage Server** permission to change the prefix.", ephemeral: true });
    return;
  }

  const newPrefix = interaction.options.getString("new_prefix", true);

  if (newPrefix.length > 5) {
    await interaction.reply({ content: "The prefix can be at most **5 characters** long.", ephemeral: true });
    return;
  }

  setPrefix(interaction.guild.id, newPrefix);

  await interaction.reply({ content: `✅ Prefix updated to \`${newPrefix}\`. You can now use prefix commands with \`${newPrefix}kick\`, \`${newPrefix}mute\`, etc.` });
}
