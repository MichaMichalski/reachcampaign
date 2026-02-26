"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

const EmailEditor = dynamic(
  () =>
    import("@/components/builders/email-editor").then((m) => m.EmailEditor),
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

export default function NewEmailPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [previewText, setPreviewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleNext() {
    if (!name.trim()) {
      setError("Template name is required.");
      return;
    }
    if (!subject.trim()) {
      setError("Subject line is required.");
      return;
    }
    setError(null);
    setStep(2);
  }

  async function handleSave(data: { designJson: object; html: string }) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          previewText: previewText.trim() || undefined,
          designJson: data.designJson,
          htmlContent: data.html,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create template");
      }

      router.push("/emails");
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
            Saving template…
          </div>
        )}
        <EmailEditor onSave={handleSave} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/emails">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Email Template
          </h2>
          <p className="text-sm text-slate-500">
            Step 1 of 2 &mdash; Enter template details
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
          <CardDescription>
            Give your email a name and subject line.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Template Name</Label>
            <Input
              id="name"
              placeholder="e.g. Welcome Email"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject Line</Label>
            <Input
              id="subject"
              placeholder="e.g. Welcome to our community!"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="previewText">Preview Text (optional)</Label>
            <Input
              id="previewText"
              placeholder="Text that appears after the subject in inbox"
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
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
          <Link href="/emails">Cancel</Link>
        </Button>
        <Button onClick={handleNext}>
          Next: Design Email
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
