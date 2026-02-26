"use client";

import { useEffect, useState, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send } from "lucide-react";

interface Note {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactNotesProps {
  contactId: string;
}

export function ContactNotes({ contactId }: ContactNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}/notes`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.data ?? data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/contacts/${contactId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setNotes((prev) => [data.data ?? data, ...prev]);
        setContent("");
      }
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-3">
        <Textarea
          placeholder="Add a note..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="resize-none"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={submitting || !content.trim()}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            {submitting ? "Adding..." : "Add Note"}
          </Button>
        </div>
      </form>

      {notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <MessageSquare className="mb-2 h-8 w-8" />
          <p className="text-sm">No notes yet. Add one above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg border bg-muted/30 p-4"
            >
              <p className="whitespace-pre-wrap text-sm">{note.content}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {formatDateTime(note.createdAt)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
