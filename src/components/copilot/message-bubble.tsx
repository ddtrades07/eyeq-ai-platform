'use client';

import { Sparkles, User, Info } from 'lucide-react';
import type { CopilotMessage } from '@/lib/ai/copilot/types';
import { cn } from '@/lib/utils';

export function MessageBubble({ msg }: { msg: CopilotMessage }) {
  const isUser = msg.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          isUser
            ? 'bg-indigo-100 text-indigo-700'
            : 'bg-gradient-to-br from-indigo-500 to-purple-500 text-white',
        )}
      >
        {isUser ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
      </div>

      <div
        className={cn(
          'max-w-[85%] space-y-2 rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-white text-foreground shadow-sm border rounded-bl-md',
        )}
      >
        <div className="whitespace-pre-wrap">{msg.content}</div>

        {msg.explainability && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <div className="mb-1 flex items-center gap-1.5 font-semibold">
              <Info className="h-3.5 w-3.5" />
              {msg.explainability.heading}
            </div>
            <ul className="ml-4 list-disc space-y-0.5">
              {msg.explainability.factors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
            <p className="mt-2 text-[10px] font-medium text-amber-700">
              {msg.explainability.disclaimer}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white">
        <Sparkles className="h-4 w-4 animate-pulse" />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border bg-white px-4 py-3 shadow-sm">
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:0ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:150ms]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-indigo-400 [animation-delay:300ms]" />
      </div>
    </div>
  );
}
