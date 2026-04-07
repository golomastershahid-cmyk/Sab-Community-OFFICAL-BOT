const MAX_PER_CHANNEL = 20;

export interface DeletedMessage {
  authorId: string;
  authorTag: string;
  authorAvatar: string | null;
  content: string;
  attachments: string[];
  deletedAt: Date;
  channelId: string;
}

export interface EditedMessage {
  authorId: string;
  authorTag: string;
  authorAvatar: string | null;
  before: string;
  after: string;
  editedAt: Date;
  channelId: string;
  messageUrl: string;
}

export interface RemovedReaction {
  userId: string;
  userTag: string;
  emoji: string;
  messageId: string;
  channelId: string;
  removedAt: Date;
}

const deletedMessages = new Map<string, DeletedMessage[]>();
const editedMessages = new Map<string, EditedMessage[]>();
const removedReactions = new Map<string, RemovedReaction[]>();

function pushToStore<T>(store: Map<string, T[]>, channelId: string, item: T): void {
  const list = store.get(channelId) ?? [];
  list.unshift(item);
  if (list.length > MAX_PER_CHANNEL) list.length = MAX_PER_CHANNEL;
  store.set(channelId, list);
}

export function storeDeletedMessage(msg: DeletedMessage): void {
  pushToStore(deletedMessages, msg.channelId, msg);
}

export function getDeletedMessage(channelId: string, index = 0): DeletedMessage | null {
  return deletedMessages.get(channelId)?.[index] ?? null;
}

export function storeEditedMessage(msg: EditedMessage): void {
  pushToStore(editedMessages, msg.channelId, msg);
}

export function getEditedMessage(channelId: string, index = 0): EditedMessage | null {
  return editedMessages.get(channelId)?.[index] ?? null;
}

export function storeRemovedReaction(r: RemovedReaction): void {
  pushToStore(removedReactions, r.channelId, r);
}

export function getRemovedReaction(channelId: string, index = 0): RemovedReaction | null {
  return removedReactions.get(channelId)?.[index] ?? null;
}
