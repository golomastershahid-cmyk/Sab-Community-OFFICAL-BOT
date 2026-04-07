import { Client, Guild, GuildMember, Invite, PartialGuildMember } from "discord.js";
import { logger } from "./lib/logger.js";
import { incrementInvite, incrementLeft } from "./invite-storage.js";

const inviteCache = new Map<string, Map<string, number>>();

export async function cacheGuildInvites(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    const map = new Map<string, number>();
    invites.forEach(inv => { if (inv.code) map.set(inv.code, inv.uses ?? 0); });
    inviteCache.set(guild.id, map);
  } catch {
    logger.warn({ guildId: guild.id }, "Could not cache invites (missing permission)");
  }
}

export async function cacheAllGuildInvites(client: Client): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await cacheGuildInvites(guild);
  }
}

export function onInviteCreate(invite: Invite): void {
  if (!invite.guild) return;
  const map = inviteCache.get(invite.guild.id) ?? new Map<string, number>();
  map.set(invite.code, invite.uses ?? 0);
  inviteCache.set(invite.guild.id, map);
}

export function onInviteDelete(invite: Invite): void {
  if (!invite.guild) return;
  const map = inviteCache.get(invite.guild.id);
  if (map) map.delete(invite.code);
}

export async function handleMemberJoin(member: GuildMember): Promise<void> {
  try {
    const cached = inviteCache.get(member.guild.id) ?? new Map<string, number>();
    const current = await member.guild.invites.fetch();
    let usedInviterId: string | null = null;

    for (const [code, cachedUses] of cached.entries()) {
      const currentInvite = current.get(code);
      if (currentInvite && (currentInvite.uses ?? 0) > cachedUses) {
        usedInviterId = currentInvite.inviterId ?? null;
        break;
      }
    }

    const updatedMap = new Map<string, number>();
    current.forEach(inv => { if (inv.code) updatedMap.set(inv.code, inv.uses ?? 0); });
    inviteCache.set(member.guild.id, updatedMap);

    if (usedInviterId) {
      incrementInvite(member.guild.id, usedInviterId);
    }
  } catch {
    logger.warn({ guildId: member.guild.id }, "Could not track invite on member join");
  }
}

export async function handleMemberLeave(member: GuildMember | PartialGuildMember): Promise<void> {
  try {
    const cached = inviteCache.get(member.guild.id) ?? new Map<string, number>();
    const current = await member.guild.invites.fetch();

    for (const [code, cachedUses] of cached.entries()) {
      const currentInvite = current.get(code);
      if (currentInvite && (currentInvite.uses ?? 0) < cachedUses) {
        if (currentInvite.inviterId) {
          incrementLeft(member.guild.id, currentInvite.inviterId);
        }
        break;
      }
    }

    const updatedMap = new Map<string, number>();
    current.forEach(inv => { if (inv.code) updatedMap.set(inv.code, inv.uses ?? 0); });
    inviteCache.set(member.guild.id, updatedMap);
  } catch {
    logger.warn({ guildId: member.guild.id }, "Could not track invite on member leave");
  }
}
