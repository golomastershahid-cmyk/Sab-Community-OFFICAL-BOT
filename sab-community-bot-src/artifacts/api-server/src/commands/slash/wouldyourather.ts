import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const SCENARIOS: [string, string][] = [
  ["Be able to fly", "Be able to breathe underwater"],
  ["Always know when someone is lying", "Always get away with lying yourself"],
  ["Give up social media forever", "Give up watching TV/movies forever"],
  ["Be famous but broke", "Be rich but unknown"],
  ["Have unlimited money but no friends", "Have amazing friends but be broke"],
  ["Be 10 minutes late to everything", "Be 20 minutes early to everything"],
  ["Fight 100 duck-sized horses", "Fight 1 horse-sized duck"],
  ["Lose all your memories from birth to now", "Lose the ability to make new memories"],
  ["Always be too hot", "Always be too cold"],
  ["Have super strength", "Have super speed"],
  ["Be able to speak every language", "Be able to talk to animals"],
  ["Only eat your favourite food forever", "Never eat your favourite food again"],
  ["Be invisible at will", "Be able to read minds"],
  ["Live in the past", "Live in the future"],
  ["Always win arguments", "Always win games"],
  ["Have free flights for life", "Have free food for life"],
  ["Never have to sleep", "Never have to eat"],
  ["Be the funniest person in the room", "Be the smartest person in the room"],
  ["Know how you will die", "Know when you will die"],
  ["Have a rewind button for your life", "Have a pause button for your life"],
  ["Be an amazing artist", "Be an amazing musician"],
  ["Never feel physical pain", "Never feel emotional pain"],
  ["Always have to say what you're thinking", "Never be able to speak again"],
  ["Live without music", "Live without movies"],
  ["Have a photographic memory", "Be able to forget anything on command"],
];

export async function handleWouldYouRather(interaction: ChatInputCommandInteraction): Promise<void> {
  const [optionA, optionB] = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
  const embed = new EmbedBuilder()
    .setColor(0xe91e8c)
    .setTitle("🤔 Would You Rather…")
    .addFields(
      { name: "🅰️ Option A", value: optionA, inline: false },
      { name: "🅱️ Option B", value: optionB, inline: false },
    )
    .setFooter({ text: "Discuss with your friends!" });
  const { resource } = await interaction.reply({ embeds: [embed], withResponse: true });
  const reply = resource?.message;
  if (reply) {
    await reply.react("🅰️").catch(() => null);
    await reply.react("🅱️").catch(() => null);
  }
}
