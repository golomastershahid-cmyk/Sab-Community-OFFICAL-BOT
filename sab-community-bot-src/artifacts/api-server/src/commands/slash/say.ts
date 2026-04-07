import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  GuildMember,
  PermissionFlagsBits,
  TextChannel,
} from "discord.js";

export async function handleSay(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ManageMessages)) {
    await interaction.reply({ content: "You need the **Manage Messages** permission to use this command.", ephemeral: true });
    return;
  }

  const channel = interaction.options.getChannel("channel", true) as TextChannel;
  const text = interaction.options.getString("text", true);
  const asEmbed = interaction.options.getBoolean("embed") ?? false;

  if (!channel.isTextBased()) {
    await interaction.reply({ content: "Please select a text channel.", ephemeral: true });
    return;
  }

  try {
    if (asEmbed) {
      const embed = new EmbedBuilder()
        .setDescription(text)
        .setColor(0x5865f2)
        .setTimestamp();
      await (channel as TextChannel).send({ embeds: [embed] });
    } else {
      await (channel as TextChannel).send(text);
    }

    await interaction.reply({ content: `✅ Message sent to ${channel}.`, ephemeral: true });
  } catch {
    await interaction.reply({ content: "❌ Failed to send the message. Make sure I have permission to send messages in that channel.", ephemeral: true });
  }
}
