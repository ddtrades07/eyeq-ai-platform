'use client';

import { create } from 'zustand';
import type { CopilotMessage, PageContext, SuggestedPrompt } from '@/lib/ai/copilot/types';

export type AssistantContext = 'PLATFORM' | 'PATIENT_CHART' | 'IMAGING' | 'SCHEDULE' | 'ADMIN';

interface CopilotState {
  /** Is the copilot panel open? */
  open: boolean;
  /** Current conversation messages. */
  messages: CopilotMessage[];
  /** AI is currently generating a response. */
  loading: boolean;
  /** Current page context for prompt injection. */
  page: PageContext;
  /** Currently selected patient (if any). */
  patientId: string | null;
  /** Role-based suggested prompts. */
  suggestions: SuggestedPrompt[];
  /** Suggested follow-up prompts from the last response. */
  followUps: string[];
  /** Stable conversation ID for the current session. */
  conversationId: string;
  /** Database conversation id once the exchange has been persisted. */
  dbConversationId: string | null;
  /** Selected assistant context. */
  contextType: AssistantContext;

  toggle: () => void;
  setOpen: (open: boolean) => void;
  setPage: (page: PageContext) => void;
  setPatientId: (id: string | null) => void;
  setSuggestions: (s: SuggestedPrompt[]) => void;
  setFollowUps: (f: string[]) => void;
  setContextType: (c: AssistantContext) => void;
  setDbConversationId: (id: string | null) => void;
  loadConversation: (id: string, messages: CopilotMessage[]) => void;

  addMessage: (msg: CopilotMessage) => void;
  setLoading: (l: boolean) => void;
  clearConversation: () => void;

  /** Open the copilot with a pre-filled message. */
  openWithPrompt: (prompt: string) => void;
  pendingPrompt: string | null;
  clearPendingPrompt: () => void;
}

export const useCopilotStore = create<CopilotState>((set) => ({
  open: false,
  messages: [],
  loading: false,
  page: 'other',
  patientId: null,
  suggestions: [],
  followUps: [],
  conversationId: crypto.randomUUID(),
  dbConversationId: null,
  contextType: 'PLATFORM',
  pendingPrompt: null,

  toggle: () => set((s) => ({ open: !s.open })),
  setOpen: (open) => set({ open }),
  setPage: (page) => set({ page }),
  setPatientId: (patientId) => set({ patientId }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setFollowUps: (followUps) => set({ followUps }),
  setContextType: (contextType) => set({ contextType }),
  setDbConversationId: (dbConversationId) => set({ dbConversationId }),
  loadConversation: (id, messages) =>
    set({
      dbConversationId: id,
      messages,
      followUps: [],
      conversationId: crypto.randomUUID(),
    }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),
  setLoading: (loading) => set({ loading }),
  clearConversation: () =>
    set({
      messages: [],
      followUps: [],
      conversationId: crypto.randomUUID(),
      dbConversationId: null,
    }),

  openWithPrompt: (prompt) =>
    set({ open: true, pendingPrompt: prompt }),
  clearPendingPrompt: () => set({ pendingPrompt: null }),
}));
