"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const PageEditor = dynamic(
  () =>
    import("@/components/builders/page-editor").then((m) => m.PageEditor),
  { ssr: false, loading: () => <EditorSkeleton /> }
);

function EditorSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
        <p className="mt-2 text-sm text-slate-500">Loading editor…</p>
      </div>
    </div>
  );
}

type PageData = {
  id: string;
  name: string;
  slug: string;
  designJson: object;
};

export default function EditPagePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [page, setPage] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/pages/${id}`);
        if (!res.ok) throw new Error("Failed to load page");
        const data = await res.json();
        setPage(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load page"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleSave(data: { designJson: object; html: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/pages/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designJson: data.designJson,
          htmlContent: data.html,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to save page");
      }

      router.push(`/pages/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error && !page) {
    return (
      <div className="flex h-[calc(100vh-7rem)] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <h3 className="text-sm font-medium text-slate-700">
          Editing: {page?.name}
        </h3>
        {saving && (
          <span className="flex items-center gap-1 text-sm text-indigo-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving…
          </span>
        )}
      </div>
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
      <div className="flex-1">
        <PageEditor designJson={page?.designJson} onSave={handleSave} />
      </div>
    </div>
  );
}
