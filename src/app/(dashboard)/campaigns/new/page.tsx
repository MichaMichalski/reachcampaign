"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
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
import {
  CampaignEditor,
  type SaveNode,
  type SaveEdge,
} from "@/components/builders/campaign-editor";

const defaultTriggerNode = {
  id: "trigger-1",
  type: "TRIGGER" as const,
  label: "Campaign Trigger",
  config: {},
  positionX: 250,
  positionY: 50,
  templateId: null,
  segmentId: null,
};

export default function NewCampaignPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async (nodes: SaveNode[], edges: SaveEdge[]) => {
    setSaving(true);
    try {
      const res = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description: description || undefined, nodes, edges }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create campaign");
      }

      const campaign = await res.json();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            New Campaign
          </h2>
          <p className="text-sm text-slate-500">
            Step {step} of 2 &mdash;{" "}
            {step === 1 ? "Campaign Details" : "Build Workflow"}
          </p>
        </div>
      </div>

      {step === 1 && (
        <Card className="mx-auto max-w-lg">
          <CardHeader>
            <CardTitle>Campaign Details</CardTitle>
            <CardDescription>
              Give your campaign a name and optional description.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Campaign Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Welcome Series"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="desc">Description (optional)</Label>
              <Textarea
                id="desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the campaign purpose..."
                rows={3}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!name.trim()}>
                Next: Build Workflow
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setStep(1)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            {saving && (
              <span className="flex items-center gap-1 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating campaign...
              </span>
            )}
          </div>
          <CampaignEditor
            campaignId="new"
            initialNodes={[defaultTriggerNode]}
            initialEdges={[]}
            onSave={handleSave}
          />
        </div>
      )}
    </div>
  );
}
