import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const ROASTS = [
  "You're the reason the gene pool needs a lifeguard.",
  "I'd agree with you, but then we'd both be wrong.",
  "You're proof that evolution can go in reverse.",
  "If brains were taxed, you'd get a refund.",
  "I'd call you a tool, but even tools are useful.",
  "You're like a cloud. When you disappear, it's a beautiful day.",
  "Somewhere out there is a tree tirelessly producing oxygen for you. You owe it an apology.",
  "You're not stupid; you just have bad luck thinking.",
  "I'd explain it to you, but I don't have crayons with me.",
  "You must have been born on a highway, because that's where most accidents happen.",
  "I've seen better heads on a glass of beer.",
  "You're as useless as the 'ueue' in 'queue'.",
  "Even your reflection rolls its eyes when it sees you.",
  "You're not the dumbest person in the world, but you better hope they don't die.",
  "I would roast you harder, but my mom told me not to burn trash.",
  "I'd say you should go outside more, but I don't want to ruin nature.",
  "Your family tree must be a cactus — everyone on it is a prick.",
  "The human equivalent of a participation trophy.",
];

export async function handleRoast(interaction: ChatInputCommandInteraction): Promise<void> {
  const target = interaction.options.getUser("user", true);
  const roast = ROASTS[Math.floor(Math.random() * ROASTS.length)];
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🔥 Roasted!")
    .setDescription(`<@${target.id}>, ${roast}`)
    .setFooter({ text: `Requested by ${interaction.user.tag}` })
    .setTimestamp();
  await interaction.reply({ embeds: [embed] });
}
