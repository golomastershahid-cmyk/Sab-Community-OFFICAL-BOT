import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export async function handlePoll(interaction: ChatInputCommandInteraction): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({ content: "This command can only be used in a server.", ephemeral: true });
    return;
  }

  const question = interaction.options.getString("question", true);

  const options: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const opt = interaction.options.getString(`option${i}`);
    if (opt) options.push(opt);
  }

  if (options.length < 2) {
    await interaction.reply({ content: "Please provide at least 2 options for the poll.", ephemeral: true });
    return;
  }

  const optionLines = options
    .map((opt, i) => `${NUMBER_EMOJIS[i]} ${opt}`)
    .join("\n\n");

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📊 " + question)
    .setDescription(optionLines)
    .setFooter({ text: `Poll by ${interaction.user.tag} • React to vote!` })
    .setTimestamp();

  const pollMessage = await interaction.reply({ embeds: [embed], fetchReply: true });

  for (let i = 0; i < options.length; i++) {
    await pollMessage.react(NUMBER_EMOJIS[i]).catch(() => null);
  }
}
