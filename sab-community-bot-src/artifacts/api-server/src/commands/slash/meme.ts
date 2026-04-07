import { ChatInputCommandInteraction, EmbedBuilder } from "discord.js";

const SUBREDDITS = ["memes", "dankmemes", "me_irl", "funny", "comedyheaven"];

async function fetchFromMemeApi(sub: string): Promise<{ title: string; url: string; postLink: string; ups: number; subreddit: string } | null> {
  try {
    const res = await fetch(`https://meme-api.com/gimme/${sub}`, {
      headers: { "User-Agent": "discord-bot/1.0" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    if (!json?.url || json.nsfw || json.spoiler) return null;
    return { title: json.title, url: json.url, postLink: json.postLink, ups: json.ups, subreddit: json.subreddit };
  } catch {
    return null;
  }
}

async function fetchFromReddit(sub: string): Promise<{ title: string; url: string; postLink: string; ups: number; subreddit: string } | null> {
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=day&limit=50`, {
      headers: { "User-Agent": "discord-bot/1.0 (by /u/discordbot)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const json = await res.json() as any;
    const posts: any[] = json?.data?.children ?? [];
    const valid = posts
      .map((p: any) => p.data)
      .filter((p: any) => !p.over_18 && !p.spoiler && p.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i));
    if (valid.length === 0) return null;
    const post = valid[Math.floor(Math.random() * valid.length)];
    return { title: post.title, url: post.url, postLink: `https://reddit.com${post.permalink}`, ups: post.ups, subreddit: post.subreddit };
  } catch {
    return null;
  }
}

export async function handleMeme(interaction: ChatInputCommandInteraction): Promise<void> {
  await interaction.deferReply();
  const sub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
  let post = await fetchFromMemeApi(sub);
  if (!post) post = await fetchFromReddit(sub);
  if (!post) {
    await interaction.editReply("Failed to fetch a meme. Try again in a moment!");
    return;
  }
  const embed = new EmbedBuilder()
    .setColor(0xff4500)
    .setTitle(post.title.slice(0, 256))
    .setURL(post.postLink)
    .setImage(post.url)
    .setFooter({ text: `👍 ${post.ups.toLocaleString()} • r/${post.subreddit}` })
    .setTimestamp();
  await interaction.editReply({ embeds: [embed] });
}
