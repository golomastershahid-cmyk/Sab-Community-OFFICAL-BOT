import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

export async function handleJoke(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  try {
    const res = await fetch("https://official-joke-api.appspot.com/random_joke");
    const joke = await res.json() as { setup: string; punchline: string };
    const embed = new EmbedBuilder()
      .setColor(0xf1c40f)
      .setTitle("😄 Random Joke")
      .addFields(
        { name: "Setup", value: joke.setup },
        { name: "Punchline", value: `||${joke.punchline}||` },
      )
      .setFooter({ text: "Hover/click to reveal punchline" })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  } catch {
    await interaction.editReply("Couldn't fetch a joke right now. Try again later!");
  }
}
