import { ChatInputCommandInteraction, EmbedBuilder, GuildMember, PermissionFlagsBits } from "discord.js";
import { getWarnings } from "../../storage.js";

export async function handleWarnings(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }
  const executor = interaction.member as GuildMember;
  if (!executor.permissions.has(PermissionFlagsBits.ModerateMembers)) {
    await interaction.reply({ content: "You do not have permission to view warnings.", ephemeral: true });
    return;
  }
  const target = interaction.options.getUser("user", true);
  const warnings = getWarnings(interaction.guild.id, target.id);
  const embed = new EmbedBuilder()
    .setColor(0x3498db)
    .setTitle(`Warnings for ${target.tag}`)
    .setThumbnail(target.displayAvatarURL())
    .setTimestamp();
  if (warnings.length === 0) {
    embed.setDescription("This user has no warnings.");
  } else {
    embed.setDescription(`**${warnings.length}** warning${warnings.length !== 1 ? "s" : ""} total`);
    warnings.slice(-10).forEach((w, i) => {
      embed.addFields({
        name: `Warning #${i + 1} — <t:${Math.floor(new Date(w.timestamp).getTime() / 1000)}:R>`,
        value: `**Reason:** ${w.reason}\n**By:** <@${w.moderatorId}>`,
      });
    });
  }
  await interaction.reply({ embeds: [embed] });
}
