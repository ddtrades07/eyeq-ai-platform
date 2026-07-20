'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, BookPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { createKnowledgeDocument } from '@/server/actions/knowledge';

export function AddKnowledgeDocumentForm() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [title, setTitle] = React.useState('');
  const [category, setCategory] = React.useState('clinical');
  const [content, setContent] = React.useState('');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await createKnowledgeDocument({
        title,
        category,
        content,
        approve: false,
      });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Knowledge document saved; embeddings queued');
      setTitle('');
      setContent('');
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label>Category</Label>
          <Input value={category} onChange={(e) => setCategory(e.target.value)} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Content</Label>
        <Textarea
          rows={6}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Approved clinical reference text for RAG retrieval…"
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookPlus className="h-4 w-4" />}
        Add knowledge document
      </Button>
    </form>
  );
}
