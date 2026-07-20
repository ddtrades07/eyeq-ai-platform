'use client';

import { FileText } from 'lucide-react';

export function DraftIndicator({
  hasDraft,
  onRestore,
  onDiscard,
}: {
  hasDraft: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}) {
  if (!hasDraft) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
      <FileText className="h-3.5 w-3.5" />
      <span className="font-medium">Unsaved draft found</span>
      <button
        type="button"
        onClick={onRestore}
        className="ml-auto rounded bg-amber-600 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-amber-700"
      >
        Restore
      </button>
      <button
        type="button"
        onClick={onDiscard}
        className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:bg-amber-200"
      >
        Discard
      </button>
    </div>
  );
}
