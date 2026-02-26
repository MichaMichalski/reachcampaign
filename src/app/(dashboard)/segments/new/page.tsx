"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  SegmentFilterBuilder,
  type FilterRule,
} from "@/components/shared/segment-filter-builder";
import { ArrowLeft, Loader2, Users } from "lucide-react";

export default function NewSegmentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"DYNAMIC" | "STATIC">("DYNAMIC");
  const [filters, setFilters] = useState<FilterRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Segment name is required.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/v1/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          type,
          filters: type === "DYNAMIC" ? filters : [],
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create segment");
      }

      const segment = await res.json();
      router.push(`/segments/${segment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/segments">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Create Segment
          </h2>
          <p className="text-sm text-slate-500">
            Define a new segment to target contacts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
            <CardDescription>
              Give your segment a name and choose its type.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. High-value leads"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Optional description for this segment..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as "DYNAMIC" | "STATIC")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DYNAMIC">
                    Dynamic &mdash; auto-updated by filter rules
                  </SelectItem>
                  <SelectItem value="STATIC">
                    Static &mdash; manually managed members
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {type === "DYNAMIC" ? (
          <Card>
            <CardHeader>
              <CardTitle>Filters</CardTitle>
              <CardDescription>
                Contacts matching all of these rules will be included in this
                segment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SegmentFilterBuilder filters={filters} onChange={setFilters} />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Members</CardTitle>
              <CardDescription>
                Static segments are managed manually.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <div className="rounded-full bg-slate-100 p-3">
                  <Users className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500">
                  You can add contacts to this segment after creating it.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" asChild>
            <Link href="/segments">Cancel</Link>
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Segment
          </Button>
        </div>
      </form>
    </div>
  );
}
