"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";

interface DeleteFormButtonProps {
  formId: string;
  formName: string;
}

export function DeleteFormButton({ formId, formName }: DeleteFormButtonProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete form "${formName}"? This cannot be undone.`)) {
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(`/api/v1/forms/${formId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete form");
      }

      router.push("/forms");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete form");
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
