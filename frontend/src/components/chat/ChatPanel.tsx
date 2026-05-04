'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  getConversations,
  createConversation,
  addMessage,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  renameConversation,
  type Conversation,
  type ChatMsg,
} from '@/lib/chatStorage';

// ── Types ────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  restaurantName: string;
  location: string;
  topIssues?: string[];
  recommendations?: string[];
}

const SUGGESTIONS = [
  'What are the top complaints from customers?',
  'What are competitors doing better than us?',
  'Create a 30-day action plan to improve our rating.',
  'What are our biggest strengths to highlight?',
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return formatTime(ts);
}

// Renders markdown-lite: **bold**, bullet lists, headings (##)
function MsgContent({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (/^###?\s/.test(line)) {
          const content = line.replace(/^###?\s/, '');
          return <p key={i} className="font-semibold text-white mt-2">{renderInline(content)}</p>;
        }
        if (/^[-*•]\s/.test(line)) {
          const content = line.replace(/^[-*•]\s/, '');
          return (
            <div key={i} className="flex gap-2">
              <span className="text-violet-400 mt-0.5 shrink-0">•</span>
              <span>{renderInline(content)}</span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-semibold text-white">{part.slice(2, -2)}</strong>
      : part
  );
}

// ── ConversationList ─────────────────────────────────────────────────────────

function ConversationList({
  convos,
  onSelect,
  onNew,
  onDelete,
  onArchive,
  onUnarchive,
}: {
  convos: Conversation[];
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
}) {
  const [menuId, setMenuId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const active = convos.filter((c) => c.status === 'active');
  const archived = convos.filter((c) => c.status === 'archived');
  const visible = showArchived ? archived : active;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E1E2E]">
        <div>
          <p className="text-sm font-semibold text-white">AI Advisor</p>
          <p className="text-xs text-gray-400">Ask anything about your reviews</p>
        </div>
        <button
          onClick={onNew}
          className="flex items-center gap-1 text-xs font-medium bg-violet-600 hover:bg-violet-500 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
          New chat
        </button>
      </div>

      {/* Tab toggle */}
      {archived.length > 0 && (
        <div className="flex px-4 pt-3 gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${!showArchived ? 'bg-violet-600/20 text-violet-300' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Active ({active.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${showArchived ? 'bg-violet-600/20 text-violet-300' : 'text-gray-500 hover:text-gray-300'}`}
          >
            Archived ({archived.length})
          </button>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full px-6 text-center gap-3">
            <div className="w-12 h-12 rounded-full bg-violet-600/10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <p className="text-sm text-gray-400">No conversations yet</p>
            <p className="text-xs text-gray-500">Start a new chat to ask questions about your reviews</p>
            <button
              onClick={onNew}
              className="mt-1 text-xs font-medium text-violet-400 hover:text-violet-300 underline underline-offset-2"
            >
              Start your first conversation
            </button>
          </div>
        ) : (
          visible.map((c) => (
            <div
              key={c.id}
              className="relative group flex items-start gap-3 px-4 py-3 hover:bg-[#1A1A2E] cursor-pointer transition-colors"
              onClick={() => { if (menuId !== c.id) onSelect(c.id); }}
            >
              <div className="w-8 h-8 shrink-0 rounded-full bg-violet-600/15 flex items-center justify-center mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{c.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.messages.length} messages · {timeAgo(c.updatedAt)}</p>
              </div>

              {/* Kebab menu */}
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuId(menuId === c.id ? null : c.id); }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-400 hover:text-white hover:bg-[#252540] transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
                </button>
                {menuId === c.id && (
                  <div
                    className="absolute right-0 top-6 z-50 bg-[#1E1E32] border border-[#2E2E4E] rounded-lg shadow-xl py-1 min-w-[140px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {c.status === 'active' ? (
                      <button
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#252540] hover:text-white flex items-center gap-2"
                        onClick={() => { archiveConversation(c.id); onArchive(c.id); setMenuId(null); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>
                        Archive
                      </button>
                    ) : (
                      <button
                        className="w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-[#252540] hover:text-white flex items-center gap-2"
                        onClick={() => { unarchiveConversation(c.id); onUnarchive(c.id); setMenuId(null); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.51"/></svg>
                        Restore
                      </button>
                    )}
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-[#252540] hover:text-red-300 flex items-center gap-2"
                      onClick={() => { deleteConversation(c.id); onDelete(c.id); setMenuId(null); }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── ActiveChat ───────────────────────────────────────────────────────────────

function ActiveChat({
  conversation,
  onBack,
  onNewMessage,
  restaurantName,
  location,
  topIssues,
  recommendations,
}: {
  conversation: Conversation;
  onBack: () => void;
  onNewMessage: () => void;
  restaurantName: string;
  location: string;
  topIssues: string[];
  recommendations: string[];
}) {
  const [messages, setMessages] = useState<ChatMsg[]>(conversation.messages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setInput('');

    // Persist + show user message
    const userMsg = addMessage(conversation.id, 'user', trimmed);
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Build history from current messages (before this turn)
    const history = messages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch(`${API_BASE}/api/v1/restaurants/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: restaurantName,
          location,
          message: trimmed,
          history,
          top_issues: topIssues,
          recommendations,
        }),
      });

      const data: { reply: string; fallback: boolean } = await res.json();
      const assistantMsg = addMessage(conversation.id, 'assistant', data.reply);
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errMsg = addMessage(conversation.id, 'assistant', 'Sorry, I couldn\'t reach the server. Please check the backend is running.');
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
      onNewMessage();
      inputRef.current?.focus();
    }
  }, [loading, messages, conversation.id, restaurantName, location, topIssues, recommendations, onNewMessage]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1E1E2E] shrink-0">
        <button
          onClick={onBack}
          className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#1E1E2E] transition-colors"
          aria-label="Back to conversations"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate">{conversation.title}</p>
          <p className="text-xs text-gray-400">{restaurantName}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500 text-center">Suggested questions</p>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="w-full text-left text-xs text-gray-300 bg-[#1A1A2E] hover:bg-[#222240] border border-[#2E2E4E] rounded-xl px-4 py-3 transition-colors leading-relaxed"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 shrink-0 rounded-full bg-violet-600/20 flex items-center justify-center mr-2 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              </div>
            )}
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-violet-600 text-white rounded-br-sm'
                  : 'bg-[#1A1A2E] text-gray-200 rounded-bl-sm border border-[#2E2E4E]'
              }`}
            >
              {msg.role === 'assistant' ? <MsgContent text={msg.content} /> : <p>{msg.content}</p>}
              <p className={`text-[10px] mt-1.5 ${msg.role === 'user' ? 'text-violet-200/60' : 'text-gray-600'}`}>
                {timeAgo(msg.timestamp)}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 shrink-0 rounded-full bg-violet-600/20 flex items-center justify-center mr-2 mt-0.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            </div>
            <div className="bg-[#1A1A2E] border border-[#2E2E4E] rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-2 shrink-0 border-t border-[#1E1E2E]">
        <div className="flex items-end gap-2 bg-[#1A1A2E] border border-[#2E2E4E] rounded-2xl px-4 py-2 focus-within:border-violet-500/50 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything about your reviews…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-32 min-h-[1.5rem] py-1"
            style={{ lineHeight: '1.5rem' }}
            disabled={loading}
            autoFocus
          />
          <button
            onClick={() => send(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 mb-1 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
            aria-label="Send message"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white -rotate-45"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
        <p className="text-[10px] text-gray-600 mt-1.5 text-center">Shift+Enter for new line · Enter to send</p>
      </div>
    </div>
  );
}

// ── ChatPanel (main export) ──────────────────────────────────────────────────

export default function ChatPanel({
  open,
  onClose,
  restaurantName,
  location,
  topIssues = [],
  recommendations = [],
}: ChatPanelProps) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Load conversations from localStorage on open
  useEffect(() => {
    if (open) {
      setConvos(getConversations(restaurantName, location));
    }
  }, [open, restaurantName, location]);

  const refresh = useCallback(() => {
    setConvos(getConversations(restaurantName, location));
  }, [restaurantName, location]);

  const handleNew = useCallback(() => {
    // Create a placeholder conversation; the first message will set the title
    const dummy = createConversation(restaurantName, location, 'New conversation');
    refresh();
    setActiveId(dummy.id);
  }, [restaurantName, location, refresh]);

  const handleSelect = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleBack = useCallback(() => {
    setActiveId(null);
    refresh();
  }, [refresh]);

  const activeConvo = convos.find((c) => c.id === activeId) ?? null;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-[420px] bg-[#13131F] border-l border-[#1E1E2E] flex flex-col shadow-2xl"
        role="dialog"
        aria-label="AI Advisor chat panel"
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#1E1E2E] transition-colors z-10"
          aria-label="Close chat panel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeConvo ? (
            <ActiveChat
              conversation={activeConvo}
              onBack={handleBack}
              onNewMessage={refresh}
              restaurantName={restaurantName}
              location={location}
              topIssues={topIssues}
              recommendations={recommendations}
            />
          ) : (
            <ConversationList
              convos={convos}
              onSelect={handleSelect}
              onNew={handleNew}
              onDelete={refresh}
              onArchive={refresh}
              onUnarchive={refresh}
            />
          )}
        </div>
      </div>
    </>
  );
}
