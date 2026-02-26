"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface DeletePageButtonProps {
  pageId: string;
  pageName: string;
}

export function DeletePageButton({ pageId, pageName }: DeletePageButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete page "${pageName}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/pages/${pageId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete page");
      }

      router.push("/pages");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete page");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={handleDelete}
      disabled={deleting}
    >
      {deleting ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Trash2 className="h-4 w-4" />
      )}
      Delete
    </Button>
  );
}
