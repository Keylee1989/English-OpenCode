/**
 * AI conversation history store (Phase 5).
 *
 * Persists tutor / error-analysis / dialogue / writing-review / roleplay
 * conversations to Dexie (schema v6). NEVER stores API keys or raw request
 * headers - only message content the user and assistant exchanged.
 */
import { db, type ConversationMessage, type ConversationRow, type ConversationType } from "@/data/db";
import Dexie from "dexie";
import { newId } from "@/core/ids";

export interface CreateConversationInput {
  type: ConversationType;
  relatedDay?: number;
  relatedKnowledgeIds?: string[];
  /** Opening system/user message(s); assistant replies are appended later. */
  initialMessages?: ConversationMessage[];
}

export async function createConversation(
  input: CreateConversationInput,
): Promise<ConversationRow> {
  const now = Date.now();
  const row: ConversationRow = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    type: input.type,
    messages: input.initialMessages ?? [],
    relatedDay: input.relatedDay,
    relatedKnowledgeIds: input.relatedKnowledgeIds ?? [],
  };
  await db.conversations.put(row);
  return row;
}

export async function getConversation(id: string): Promise<ConversationRow | null> {
  return (await db.conversations.get(id)) ?? null;
}

export async function appendMessage(
  id: string,
  message: ConversationMessage,
): Promise<void> {
  const row = await db.conversations.get(id);
  if (!row) return;
  row.messages.push(message);
  row.updatedAt = Date.now();
  await db.conversations.put(row);
}

export interface ListConversationsOptions {
  type?: ConversationType;
  limit?: number;
}

export async function listConversations(
  options: ListConversationsOptions = {},
): Promise<ConversationRow[]> {
  let rows = await db.conversations.orderBy("updatedAt").reverse().toArray();
  if (options.type) rows = rows.filter((row) => row.type === options.type);
  return typeof options.limit === "number" ? rows.slice(0, options.limit) : rows;
}

export async function deleteConversation(id: string): Promise<void> {
  await db.conversations.delete(id);
}

export async function deleteAllConversations(type?: ConversationType): Promise<number> {
  const rows = await listConversations({ type });
  for (const row of rows) await db.conversations.delete(row.id);
  return rows.length;
}

/** Replace roleplay state (meta) in place; keeps message log intact. */
export interface PaginateOptions {
  /** Omit to paginate across ALL conversation types (Phase 11-A history page). */
  type?: ConversationType;
  /** 1-based page number. */
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * DB-level pagination (Phase 6; extended Phase 11-A).
 * With `type` set, uses the [type+updatedAt] compound index; without it,
 * paginates every conversation by updatedAt. Newest first either way.
 */
export async function paginateConversations(
  options: PaginateOptions,
): Promise<Paginated<ConversationRow>> {
  const pageSize = Math.max(1, Math.min(200, options.pageSize));
  const page = Math.max(1, options.page);
  const collection = options.type
    ? db.conversations
        .where("[type+updatedAt]")
        .between([options.type, Dexie.minKey], [options.type, Dexie.maxKey], true, true)
        .reverse()
    : db.conversations.orderBy("updatedAt").reverse();
  const total = await collection.count();
  const rows = await collection
    .offset((page - 1) * pageSize)
    .limit(pageSize)
    .toArray();
  return { rows, total, page, pageSize, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function updateRoleplayMeta(
  id: string,
  meta: NonNullable<ConversationRow["meta"]>,
): Promise<void> {
  const row = await db.conversations.get(id);
  if (!row) return;
  row.meta = meta;
  row.updatedAt = Date.now();
  await db.conversations.put(row);
}
