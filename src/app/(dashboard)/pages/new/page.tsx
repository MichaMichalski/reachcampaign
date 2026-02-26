"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { slugify } from "@/lib/utils";

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

export default function NewPagePage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(slugify(value));
  }

  function handleNext() {
    if (!name.trim()) {
      setError("Page name is required.");
      return;
    }
    if (!slug.trim()) {
      setError("Slug is required.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSave(data: { designJson: object; html: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          metaTitle: metaTitle.trim() || undefined,
          metaDescription: metaDescription.trim() || undefined,
          designJson: data.designJson,
          htmlContent: data.html,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create page");
      }

      router.push("/pages");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (step === 2) {
    return (
      <div className="flex h-[calc(100vh-7rem)] flex-col">
        {error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {error}
          </div>
        )}
        {saving && (
          <div className="border-b border-indigo-200 bg-indigo-50 px-4 py-2 text-sm text-indigo-600">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Saving page…
          </div>
        )}
        <PageEditor onSave={handleSave} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/pages">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Landing Page
          </h2>
          <p className="text-sm text-slate-500">
            Step 1 of 2 &mdash; Enter page details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Page Details</CardTitle>
          <CardDescription>
            Set up your landing page name, URL slug, and SEO metadata.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Page Name</Label>
            <Input
              id="name"
              placeholder="e.g. Product Launch"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-500">/p/</span>
              <Input
                id="slug"
                placeholder="product-launch"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaTitle">Meta Title (optional)</Label>
            <Input
              id="metaTitle"
              placeholder="Page title for search engines"
              value={metaTitle}
              onChange={(e) => setMetaTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="metaDescription">Meta Description (optional)</Label>
            <Textarea
              id="metaDescription"
              placeholder="Brief description for search engines"
              value={metaDescription}
              onChange={(e) => setMetaDescription(e.target.value)}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex items-center justify-end gap-3">
        <Button variant="outline" asChild>
          <Link href="/pages">Cancel</Link>
        </Button>
        <Button onClick={handleNext}>
          Next: Design Page
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
