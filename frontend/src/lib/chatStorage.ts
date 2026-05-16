// Chat conversation persistence — stored in localStorage per restaurant

/** UUID v4 — falls back to Math.random on HTTP (iOS requires HTTPS for crypto.randomUUID) */
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export type MessageRole = 'user' | 'assistant';

export interface ChatMsg {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number; // epoch ms
}

export type ConversationStatus = 'active' | 'archived';

export interface Conversation {
  id: string;
  restaurantKey: string; // `${name}||${location}` normalised
  title: string; // auto-generated from first user message
  messages: ChatMsg[];
  status: ConversationStatus;
  createdAt: number;
  updatedAt: number;
}

// In-memory store — no persistence across page reloads (demo mode)
let _store: Conversation[] = [];

function load(): Conversation[] {
  return _store;
}

function save(conversations: Conversation[]): void {
  _store = conversations;
}

function restaurantKey(name: string, location: string): string {
  return `${name.trim().toLowerCase()}||${location.trim().toLowerCase()}`;
}

function titleFromMessage(msg: string): string {
  const trimmed = msg.trim();
  return trimmed.length <= 48 ? trimmed : trimmed.slice(0, 45) + '…';
}

// ── Public API ──────────────────────────────────────────────────────────────

export function getConversations(name: string, location: string): Conversation[] {
  const key = restaurantKey(name, location);
  return load()
    .filter((c) => c.restaurantKey === key)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function createConversation(name: string, location: string, firstMessage: string): Conversation {
  const all = load();
  const conv: Conversation = {
    id: generateId(),
    restaurantKey: restaurantKey(name, location),
    title: titleFromMessage(firstMessage),
    messages: [],
    status: 'active',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  save([conv, ...all]);
  return conv;
}

export function addMessage(conversationId: string, role: MessageRole, content: string): ChatMsg {
  const all = load();
  const msg: ChatMsg = {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
  };
  const updated = all.map((c) =>
    c.id === conversationId
      ? { ...c, messages: [...c.messages, msg], updatedAt: Date.now() }
      : c
  );
  save(updated);
  return msg;
}

export function archiveConversation(conversationId: string): void {
  const all = load();
  save(all.map((c) => (c.id === conversationId ? { ...c, status: 'archived' as const, updatedAt: Date.now() } : c)));
}

export function unarchiveConversation(conversationId: string): void {
  const all = load();
  save(all.map((c) => (c.id === conversationId ? { ...c, status: 'active' as const, updatedAt: Date.now() } : c)));
}

export function deleteConversation(conversationId: string): void {
  const all = load();
  save(all.filter((c) => c.id !== conversationId));
}

export function getConversation(conversationId: string): Conversation | undefined {
  return load().find((c) => c.id === conversationId);
}

export function renameConversation(conversationId: string, title: string): void {
  const all = load();
  save(all.map((c) => (c.id === conversationId ? { ...c, title, updatedAt: Date.now() } : c)));
}
