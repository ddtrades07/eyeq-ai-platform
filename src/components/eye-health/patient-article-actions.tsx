'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, BookmarkCheck, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { explainEyeHealthArticle, toggleSaveEyeHealthArticle } from '@/server/actions/eye-health';

export function PatientArticleActions({
  slug,
  initiallySaved,
}: {
  slug: string;
  initiallySaved: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = React.useState(initiallySaved);
  const [pending, startTransition] = React.useTransition();
  const [explain, setExplain] = React.useState<string | null>(null);

  function onSave() {
    startTransition(async () => {
      const r = await toggleSaveEyeHealthArticle(slug);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setSaved(r.saved);
      toast.success(r.saved ? 'Article saved' : 'Removed from saved');
      router.refresh();
    });
  }

  function onExplain() {
    startTransition(async () => {
      const r = await explainEyeHealthArticle(slug);
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      setExplain(r.text);
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onSave} disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <BookmarkCheck className="h-4 w-4" />
          ) : (
            <Bookmark className="h-4 w-4" />
          )}
          {saved ? 'Saved' : 'Save article'}
        </Button>
        <Button type="button" variant="secondary" size="sm" onClick={onExplain} disabled={pending}>
          <Sparkles className="h-4 w-4" />
          Explain in simpler words
        </Button>
      </div>
      {explain ? (
        <div className="rounded-lg border bg-muted/40 p-3 text-sm whitespace-pre-wrap text-muted-foreground">
          {explain}
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        EyeQ AI can help explain this article. For your personal diagnosis or treatment plan, please
        follow your provider’s instructions or message the office.
      </p>
    </div>
  );
}
