"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Globe, EyeOff } from "lucide-react";

interface PublishButtonProps {
  pageId: string;
  published: boolean;
}

export function PublishButton({ pageId, published }: PublishButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/pages/${pageId}/publish`, {
        method: published ? "DELETE" : "POST",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `Failed to ${published ? "unpublish" : "publish"} page`
        );
      }

      router.refresh();
    } catch (err) {
      alert(
        err instanceof Error
          ? err.message
          : `Failed to ${published ? "unpublish" : "publish"} page`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant={published ? "outline" : "default"}
      size="sm"
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : published ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Globe className="h-4 w-4" />
      )}
      {published ? "Unpublish" : "Publish"}
    </Button>
  );
}
