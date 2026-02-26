"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Calendar,
  Loader2,
  Send,
  Users,
} from "lucide-react";

type Segment = {
  id: string;
  name: string;
  memberCount: number;
};

type Template = {
  id: string;
  name: string;
  subject: string;
};

export default function SendEmailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [template, setTemplate] = useState<Template | null>(null);
  const [segments, setSegments] = useState<Segment[]>([]);
  const [loading, setLoading] = useState(true);

  const [campaignName, setCampaignName] = useState("");
  const [selectedSegmentIds, setSelectedSegmentIds] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<"now" | "later">("now");
  const [scheduledAt, setScheduledAt] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [tplRes, segRes] = await Promise.all([
          fetch(`/api/v1/emails/${id}`),
          fetch("/api/v1/segments"),
        ]);
        if (!tplRes.ok) throw new Error("Failed to load template");
        if (!segRes.ok) throw new Error("Failed to load segments");
        const tplData = await tplRes.json();
        const segData = await segRes.json();
        setTemplate(tplData);
        setSegments(segData);
        setCampaignName(`${tplData.name} Campaign`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  function toggleSegment(segId: string) {
    setSelectedSegmentIds((prev) =>
      prev.includes(segId)
        ? prev.filter((s) => s !== segId)
        : [...prev, segId]
    );
  }

  const estimatedRecipients = segments
    .filter((s) => selectedSegmentIds.includes(s.id))
    .reduce((sum, s) => sum + s.memberCount, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!campaignName.trim()) {
      setError("Campaign name is required.");
      return;
    }
    if (selectedSegmentIds.length === 0) {
      setError("Select at least one segment.");
      return;
    }
    if (scheduleType === "later" && !scheduledAt) {
      setError("Select a scheduled date and time.");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/v1/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: campaignName.trim(),
          templateId: id,
          segmentIds: selectedSegmentIds,
          scheduledAt:
            scheduleType === "later" ? new Date(scheduledAt).toISOString() : undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create campaign");
      }

      router.push(`/emails/${id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/emails/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Send Campaign
          </h2>
          <p className="text-sm text-slate-500">
            Using template: {template?.name}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Name your campaign and choose your audience.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="campaignName">Campaign Name</Label>
              <Input
                id="campaignName"
                placeholder="e.g. March Newsletter"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Select Segments</CardTitle>
            <CardDescription>
              Choose which contact segments to send this email to.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {segments.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <Users className="h-6 w-6 text-slate-400" />
                <p className="text-sm text-slate-500">
                  No segments available.{" "}
                  <Link href="/segments/new" className="text-indigo-600 hover:underline">
                    Create one first
                  </Link>
                  .
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {segments.map((seg) => {
                  const selected = selectedSegmentIds.includes(seg.id);
                  return (
                    <button
                      key={seg.id}
                      type="button"
                      onClick={() => toggleSegment(seg.id)}
                      className={`flex w-full items-center justify-between rounded-md border px-4 py-3 text-left transition-colors ${
                        selected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          {seg.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {seg.memberCount.toLocaleString()} contacts
                        </p>
                      </div>
                      {selected && (
                        <Badge variant="default" className="text-xs">
                          Selected
                        </Badge>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedSegmentIds.length > 0 && (
              <div className="mt-4 rounded-md bg-slate-50 px-4 py-3">
                <p className="text-sm text-slate-600">
                  Estimated recipients:{" "}
                  <span className="font-semibold">
                    {estimatedRecipients.toLocaleString()}
                  </span>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Schedule</CardTitle>
            <CardDescription>
              Send immediately or schedule for later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScheduleType("now")}
                className={`flex flex-1 items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                  scheduleType === "now"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Send className="h-4 w-4" />
                Send Now
              </button>
              <button
                type="button"
                onClick={() => setScheduleType("later")}
                className={`flex flex-1 items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition-colors ${
                  scheduleType === "later"
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </button>
            </div>

            {scheduleType === "later" && (
              <div className="space-y-2">
                <Label htmlFor="scheduledAt">Send Date & Time</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  min={new Date().toISOString().slice(0, 16)}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href={`/emails/${id}`}>Cancel</Link>
          </Button>
          <Button type="submit" disabled={sending}>
            {sending && <Loader2 className="h-4 w-4 animate-spin" />}
            {scheduleType === "now" ? "Send Now" : "Schedule Campaign"}
          </Button>
        </div>
      </form>
    </div>
  );
}
