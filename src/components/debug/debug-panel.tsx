'use client';

import { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import { useCopilotStore } from '@/store/copilot';

export function DebugPanel() {
  const [expanded, setExpanded] = useState(false);
  const { page, patientId, loading, messages } = useCopilotStore();

  if (process.env.NODE_ENV !== 'development') return null;

  const aiMode = process.env.NEXT_PUBLIC_AI_PROVIDER === 'openai'
    ? 'OpenAI'
    : process.env.NEXT_PUBLIC_AI_PROVIDER === 'anthropic'
      ? 'Anthropic'
      : 'Mock (fallback)';

  const dataSource = process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Supabase' : 'Mock / Local';

  return (
    <div className="fixed bottom-4 left-4 z-[70] max-w-xs">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-1.5 rounded-lg border bg-gray-900 px-3 py-1.5 text-[10px] font-mono text-gray-300 shadow-lg transition-colors hover:bg-gray-800"
      >
        <Bug className="h-3 w-3" />
        DEV
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>

      {expanded && (
        <div className="mt-1 rounded-lg border bg-gray-900 p-3 text-[10px] font-mono text-gray-300 shadow-lg animate-in fade-in-50 slide-in-from-bottom-2 duration-150">
          <div className="space-y-1.5">
            <Row label="Page context" value={page} />
            <Row
              label="Selected patient"
              value={patientId ? patientId.slice(0, 12) + '…' : 'None'}
              warn={!patientId}
            />
            <Row label="AI mode" value={aiMode} />
            <Row label="Data source" value={dataSource} />
            <Row label="Copilot loading" value={loading ? 'Yes' : 'No'} warn={loading} />
            <Row label="Messages in chat" value={String(messages.length)} />
            <Row label="Environment" value="Development" />
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={warn ? 'text-amber-400' : 'text-gray-200'}>{value}</span>
    </div>
  );
}
