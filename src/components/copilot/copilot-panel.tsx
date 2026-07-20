'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import {
  X, Send, Trash2, Sparkles, AlertTriangle, Square, RotateCcw, Copy, Check,
  History, MessageSquarePlus, Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useCopilotStore, type AssistantContext } from '@/store/copilot';
import { getCopilotSuggestions } from '@/server/actions/copilot';
import {
  saveAssistantExchange,
  listAssistantConversations,
  getAssistantConversation,
} from '@/server/actions/assistant';
import { MessageBubble, TypingIndicator } from './message-bubble';
import { SuggestedChips, FollowUpChips } from './suggested-chips';
import type { CopilotMessage, ExplainabilityBlock } from '@/lib/ai/copilot/types';
import { cn } from '@/lib/utils';
import { isMockAiMode } from '@/lib/env-public';

const CONTEXT_OPTIONS: { value: AssistantContext; label: string }[] = [
  { value: 'PLATFORM', label: 'General EyeQ Help' },
  { value: 'PATIENT_CHART', label: 'Current Patient' },
  { value: 'SCHEDULE', label: 'Schedule' },
  { value: 'IMAGING', label: 'Imaging Review' },
  { value: 'ADMIN', label: 'Admin' },
];

type ConversationSummary = {
  id: string;
  title: string;
  contextType: string;
  updatedAt: string;
  messageCount: number;
};

const CORE_PROMPTS = [
  { label: 'Summarize this patient', prompt: 'Summarize this patient', category: 'Patient' },
  { label: 'Generate patient instructions', prompt: 'Generate patient instructions', category: 'Patient' },
  { label: 'What needs review today?', prompt: 'What needs review today?', category: 'Workflow' },
  { label: 'Explain this imaging status', prompt: 'Explain this imaging status', category: 'Imaging' },
  { label: 'Help me finish this chart', prompt: 'Help me finish this chart', category: 'Charting' },
  { label: 'Show pending AI notes', prompt: 'Show pending AI notes', category: 'Workflow' },
];

const CACHE = new Map<string, { content: string; explainability?: ExplainabilityBlock; followUps: string[] }>();

function cacheKey(role: string, page: string, patientId: string | null, query: string) {
  return `${role}::${page}::${patientId ?? ''}::${query.trim().toLowerCase()}`;
}

export function CopilotPanel() {
  const {
    open, setOpen, messages, addMessage, loading, setLoading,
    page, patientId, suggestions, setSuggestions,
    followUps, setFollowUps, clearConversation,
    pendingPrompt, clearPendingPrompt, conversationId,
    contextType, setContextType, dbConversationId, setDbConversationId,
    loadConversation,
  } = useCopilotStore();

  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [lastQuery, setLastQuery] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ConversationSummary[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading, streamingText]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    startTransition(async () => {
      const r = await getCopilotSuggestions({ page, patientId });
      if (r.ok) setSuggestions(r.data);
    });
  }, [open, page, patientId, setSuggestions]);

  useEffect(() => {
    if (pendingPrompt && open && !loading) {
      handleSend(pendingPrompt);
      clearPendingPrompt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPrompt, open]);

  // ── Stop streaming ─────────────────────────────────────────────
  function handleStop() {
    abortRef.current?.abort();
    if (streamingText) {
      addMessage({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: streamingText + '\n\n*(Response stopped by user.)*',
        createdAt: new Date().toISOString(),
      });
      setStreamingText('');
    }
    setLoading(false);
  }

  // ── Copy response ──────────────────────────────────────────────
  function handleCopy(msg: CopilotMessage) {
    navigator.clipboard.writeText(msg.content).then(() => {
      setCopiedId(msg.id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }

  // ── Retry last message ─────────────────────────────────────────
  function handleRetry() {
    if (lastQuery) handleSend(lastQuery);
  }

  // ── Conversation history ───────────────────────────────────────
  async function openHistory() {
    setShowHistory(true);
    setHistoryLoading(true);
    const r = await listAssistantConversations({});
    if (r.ok) setHistoryItems(r.data);
    else toast.error(r.error);
    setHistoryLoading(false);
  }

  async function openConversation(id: string) {
    const r = await getAssistantConversation({ id });
    if (!r.ok) { toast.error(r.error); return; }
    loadConversation(r.data.id, r.data.messages);
    setShowHistory(false);
  }

  // ── Persist a completed exchange ───────────────────────────────
  function persistExchange(userText: string, assistantText: string) {
    startTransition(async () => {
      const r = await saveAssistantExchange({
        conversationId: dbConversationId,
        contextType,
        patientId: contextType === 'PATIENT_CHART' ? patientId : null,
        userText,
        assistantText,
      });
      if (r.ok) setDbConversationId(r.data.conversationId);
    });
  }

  // ── Send message ───────────────────────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const msg = (text ?? input).trim();
      if (!msg || loading) return;
      setInput('');
      setLastQuery(msg);

      const userMsg: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: msg,
        createdAt: new Date().toISOString(),
      };
      addMessage(userMsg);
      setLoading(true);
      setStreamingText('');
      setFollowUps([]);

      // Check cache
      const key = cacheKey('default', page, patientId, msg);
      const cached = CACHE.get(key);
      if (cached) {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: cached.content,
          explainability: cached.explainability,
          createdAt: new Date().toISOString(),
        });
        setFollowUps(cached.followUps);
        setLoading(false);
        persistExchange(msg, cached.content);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 28_000);

      const appendFallback = (note: string) => {
        addMessage({
          id: crypto.randomUUID(),
          role: 'assistant',
          content: [
            '**EyeQ could not complete this request.**',
            '',
            note,
            '',
            '**Provider review required.** Responses use only data available in EyeQ when the request succeeds.',
            patientId
              ? 'Patient context was included where available.'
              : '**Missing information:** No patient selected. Select a patient for chart-specific answers.',
          ].join('\n'),
          explainability: {
            heading: 'Why EyeQ responded this way',
            factors: [
              'The AI service did not return a full response.',
              isMockAiMode() ? 'Running in Mock AI Mode (no live API key).' : 'Live AI provider configured.',
            ],
            disclaimer: 'Provider review required. Do not use for diagnosis.',
          },
          createdAt: new Date().toISOString(),
        });
      };

      try {
        const resp = await fetch('/api/copilot/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: msg,
            conversationId,
            history: [...messages, userMsg],
            page,
            patientId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!resp.ok) {
          const err = await resp.json().catch(() => ({ error: 'Unknown error' }));
          toast.error(err.error ?? 'Failed to reach EyeQ AI');
          appendFallback('Please retry, or check your connection and API configuration.');
          setLoading(false);
          return;
        }

        const reader = resp.body?.getReader();
        if (!reader) {
          toast.error('Streaming not supported');
          appendFallback('Streaming is not supported in this browser.');
          setLoading(false);
          return;
        }

        const decoder = new TextDecoder();
        let accumulated = '';
        let messageId = crypto.randomUUID();
        let explainability: ExplainabilityBlock | undefined;
        let suggestedFollowUps: string[] = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'delta') {
                accumulated += data.content;
                setStreamingText(accumulated);
              } else if (data.type === 'done') {
                messageId = data.id ?? messageId;
                explainability = data.explainability;
                suggestedFollowUps = data.suggestedFollowUps ?? [];
              }
            } catch { /* skip malformed */ }
          }
        }

        const assistantMsg: CopilotMessage = {
          id: messageId,
          role: 'assistant',
          content: accumulated,
          explainability,
          createdAt: new Date().toISOString(),
        };
        setStreamingText('');
        addMessage(assistantMsg);
        setFollowUps(suggestedFollowUps);

        // Cache and persist the response
        if (!accumulated.trim()) {
          appendFallback('The response was empty. Try a shorter question or select a patient first.');
        } else {
          CACHE.set(key, { content: accumulated, explainability, followUps: suggestedFollowUps });
          persistExchange(msg, accumulated);
        }
      } catch (err) {
        clearTimeout(timeoutId);
        if ((err as Error).name === 'AbortError') {
          // User stop or timeout, partial stream may already be in UI via handleStop.
        } else {
          toast.error('Failed to reach EyeQ AI. Please try again.');
          appendFallback('Network or server error. A deterministic fallback may be used on retry.');
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [input, loading, addMessage, setLoading, messages, conversationId, page, patientId, setFollowUps, dbConversationId, contextType],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l bg-gray-50/95 shadow-2xl backdrop-blur-sm animate-in slide-in-from-right-2 duration-150 sm:w-[420px]">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 text-white">
        <div className="flex items-center gap-2">
          <Sparkles className={cn('h-5 w-5', loading && 'animate-pulse')} />
          <div>
            <h2 className="text-sm font-bold">Ask EyeQ</h2>
            <p className="text-[10px] text-indigo-200">
              AI Decision Support &middot; Provider Review Required
              {isMockAiMode() ? ' · Mock AI Mode' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon"
            className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => { clearConversation(); setShowHistory(false); }} title="New conversation">
            <MessageSquarePlus className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon"
            className={cn(
              'h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white',
              showHistory && 'bg-white/15 text-white',
            )}
            onClick={() => (showHistory ? setShowHistory(false) : openHistory())}
            title="Conversation history">
            <History className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => clearConversation()} title="Clear conversation">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon"
            className="h-8 w-8 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Context selector */}
      <div className="flex items-center gap-2 border-b bg-white px-4 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Context
        </span>
        <select
          value={contextType}
          onChange={(e) => setContextType(e.target.value as AssistantContext)}
          className="flex-1 rounded-md border bg-gray-50 px-2 py-1 text-xs focus:border-indigo-300 focus:outline-none"
        >
          {CONTEXT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value} disabled={o.value === 'PATIENT_CHART' && !patientId}>
              {o.label}{o.value === 'PATIENT_CHART' && !patientId ? ' (select a patient)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Compliance warning */}
      <div className="flex items-center gap-2 border-b bg-amber-50 px-4 py-2 text-[10px] text-amber-800">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        <span>
          AI decision support only. All outputs require provider review.
          {patientId ? '' : ' No patient selected, so responses are general.'}
        </span>
      </div>

      {/* History view */}
      {showHistory ? (
        <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-thin">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Recent conversations
          </h3>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : historyItems.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
              No saved conversations yet. Your chats are saved automatically.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {historyItems.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => openConversation(c.id)}
                    className="w-full rounded-lg border bg-white px-3 py-2 text-left text-sm shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/50"
                  >
                    <span className="block truncate font-medium">{c.title}</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {c.messageCount} messages · {new Date(c.updatedAt).toLocaleDateString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4 scrollbar-thin">
        {messages.length === 0 && !streamingText ? (
          <div className="space-y-4">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
                <Sparkles className="h-7 w-7 text-indigo-600" />
              </div>
              <h3 className="text-base font-semibold text-foreground">How can I help?</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {patientId
                  ? "I have access to this patient's chart, imaging, and timeline intelligence."
                  : 'Select a patient for clinical context, or ask a general question.'}
              </p>
            </div>
            <SuggestedChips
              prompts={[
                ...CORE_PROMPTS,
                ...suggestions.filter(
                  (s) => !CORE_PROMPTS.some((c) => c.prompt.toLowerCase() === s.prompt.toLowerCase()),
                ),
              ]}
              onSelect={(p) => handleSend(p)}
            />
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id} className="group relative">
                <MessageBubble msg={m} />
                {m.role === 'assistant' && (
                  <button
                    onClick={() => handleCopy(m)}
                    className="absolute right-2 top-2 hidden rounded-md border bg-white/90 p-1 text-muted-foreground shadow-sm transition-colors hover:bg-gray-100 group-hover:block"
                    title="Copy response"
                  >
                    {copiedId === m.id
                      ? <Check className="h-3.5 w-3.5 text-emerald-600" />
                      : <Copy className="h-3.5 w-3.5" />}
                  </button>
                )}
              </div>
            ))}

            {/* Live streaming text */}
            {streamingText && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
                  <Sparkles className="h-4 w-4 animate-pulse" />
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-white px-4 py-3 text-sm leading-relaxed shadow-sm">
                  <div className="whitespace-pre-wrap">
                    {streamingText}
                    <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-indigo-500" />
                  </div>
                </div>
              </div>
            )}

            {loading && !streamingText && <TypingIndicator />}

            {/* Action buttons when loading */}
            {loading && (
              <div className="flex justify-center">
                <Button size="sm" variant="outline" onClick={handleStop} className="gap-1.5 text-xs">
                  <Square className="h-3 w-3" /> Stop response
                </Button>
              </div>
            )}

            {/* Retry after completion */}
            {!loading && messages.length > 0 && messages[messages.length - 1]?.role === 'assistant' && (
              <div className="flex justify-center gap-2">
                <Button size="sm" variant="ghost" onClick={handleRetry} className="gap-1.5 text-xs text-muted-foreground">
                  <RotateCcw className="h-3 w-3" /> Retry
                </Button>
              </div>
            )}

            {!loading && followUps.length > 0 && (
              <FollowUpChips followUps={followUps} onSelect={(p) => handleSend(p)} />
            )}
          </>
        )}
      </div>
      )}

      {/* Input */}
      <div className="border-t bg-white px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask EyeQ anything…"
            rows={1}
            className={cn(
              'max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border bg-gray-50 px-4 py-2.5 text-sm',
              'placeholder:text-muted-foreground focus:border-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-200',
            )}
          />
          <Button
            size="icon"
            disabled={!input.trim() || loading}
            onClick={() => handleSend()}
            className="h-10 w-10 shrink-0 rounded-xl bg-indigo-600 hover:bg-indigo-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[9px] text-muted-foreground">
          EyeQ AI surfaces review-support signals only. It does not diagnose disease.
        </p>
      </div>
    </div>
  );
}
