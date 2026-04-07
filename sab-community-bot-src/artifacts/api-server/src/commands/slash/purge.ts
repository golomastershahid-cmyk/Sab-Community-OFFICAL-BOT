import { ChatInputCommandInteraction, GuildMember, PermissionFlagsBits, TextChannel } from "discord.js";

export async function handlePurge(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "You do not have permission to delete messages.", ephemeral: true });
    return;
  }
  const amount = interaction.options.getInteger("amount", true);
  const channel = interaction.channel as TextChannel;
  await interaction.deferReply({ ephemeral: true });
  const deleted = await channel.bulkDelete(amount, true).catch(() => null);
  const count = deleted?.size ?? 0;
  await interaction.editReply({ content: `Deleted **${count}** message${count !== 1 ? "s" : ""}.` });
}
