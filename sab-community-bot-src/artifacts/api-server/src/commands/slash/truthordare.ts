import {
  ChatInputCommandInteraction, EmbedBuilder,
  ButtonBuilder, ButtonStyle, ActionRowBuilder, ButtonInteraction, MessageFlags,
} from "discord.js";

const TRUTHS = [
  "What's the most embarrassing thing that has ever happened to you?",
  "Have you ever lied to get out of trouble? What was it?",
  "What's the worst gift you've ever received?",
  "Who was your first crush?",
  "What's a secret you've never told anyone?",
  "Have you ever cheated on a test or game?",
  "What's the most childish thing you still do?",
  "Have you ever blamed someone else for something you did?",
  "What's the most trouble you've ever been in?",
  "What's your biggest fear?",
  "Have you ever stood someone up?",
  "What's the most embarrassing song you love?",
  "Have you ever read someone else's messages without them knowing?",
  "What's the biggest lie you've ever told?",
  "What's the most ridiculous thing you've ever cried about?",
  "Have you ever pretended to be sick to avoid something?",
  "What's your most embarrassing nickname?",
  "Have you ever sent a message to the wrong person?",
  "What's something you're secretly bad at?",
  "What's a weird habit you have that nobody knows about?",
];

const DARES = [
  "Send a voice message saying 'I love broccoli' to the next person in your contacts.",
  "Do your best impression of someone in this server.",
  "Type only in capitals for the next 5 minutes.",
  "Change your nickname to 'Potato' for 10 minutes.",
  "Send a GIF that describes your personality right now.",
  "Say the alphabet backwards as fast as you can.",
  "Type a compliment to every person in this chat.",
  "Do 10 push-ups and report back.",
  "Speak in rhymes for your next 3 messages.",
  "Write a haiku about the last person who messaged you.",
  "Set your status to 'I smell like cheese' for the next 30 minutes.",
  "Tell an original joke — it must make someone laugh.",
  "Send a message in another language and don't say what language it is.",
  "Do your best robot impression in a voice message.",
  "Write a 3-sentence story that includes a dragon, a sandwich, and a Discord bot.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function handleTruthOrDare(interaction: ChatInputCommandInteraction): Promise<void> {
  const embed = new EmbedBuilder()
    .setColor(0xe74c3c)
    .setTitle("🎭 Truth or Dare")
    .setDescription("Choose your fate! Pick **Truth** or **Dare** below.");

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("tod_truth").setLabel("Truth").setEmoji("🤔").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("tod_dare").setLabel("Dare").setEmoji("🔥").setStyle(ButtonStyle.Danger),
  );

  await interaction.reply({ embeds: [embed], components: [row] });
}

export async function handleTodButton(interaction: ButtonInteraction): Promise<void> {
  if (interaction.customId === "tod_truth") {
    const truth = pickRandom(TRUTHS);
    const embed = new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle("🤔 Truth")
      .setDescription(truth)
      .setFooter({ text: `Asked to ${interaction.user.username}` });
    await interaction.reply({ embeds: [embed] });
  } else if (interaction.customId === "tod_dare") {
    const dare = pickRandom(DARES);
    const embed = new EmbedBuilder()
      .setColor(0xe74c3c)
      .setTitle("🔥 Dare")
      .setDescription(dare)
      .setFooter({ text: `Dared to ${interaction.user.username}` });
    await interaction.reply({ embeds: [embed] });
  }
}
