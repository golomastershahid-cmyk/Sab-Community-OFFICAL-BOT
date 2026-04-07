import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";
import { setAfk, getAfk, getAllAfk } from "../../afk-storage.js";

export async function handleAfkSet(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const message = interaction.options.getString("message") ?? "AFK";
  setAfk(interaction.guild.id, interaction.user.id, message);
  await interaction.reply({ content: `💤 You are now AFK: **${message}**`, ephemeral: true });
}

export async function handleAfkStatus(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user");

  if (target) {
    const entry = getAfk(interaction.guild.id, target.id);
    if (!entry) {
      await interaction.reply({ content: `<@${target.id}> is not AFK.`, ephemeral: true });
      return;
    }
    const setAt = Math.floor(new Date(entry.setAt).getTime() / 1000);
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`💤 ${target.tag} is AFK`)
      .addFields(
        { name: "Message", value: entry.message, inline: false },
        { name: "Since", value: `<t:${setAt}:R>`, inline: true },
      )
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  } else {
    const all = getAllAfk(interaction.guild.id);
    if (all.length === 0) {
      await interaction.reply({ content: "No members are currently AFK.", ephemeral: true });
      return;
    }
    const lines = all.map(e => {
      const setAt = Math.floor(new Date(e.setAt).getTime() / 1000);
      return `<@${e.userId}> — ${e.message} (since <t:${setAt}:R>)`;
    });
    const embed = new EmbedBuilder()
      .setColor(0x95a5a6)
      .setTitle(`💤 AFK Members (${all.length})`)
      .setDescription(lines.join("\n"))
      .setTimestamp();
    await interaction.reply({ embeds: [embed] });
  }
}
