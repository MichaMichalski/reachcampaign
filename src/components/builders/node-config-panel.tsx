"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import type { CampaignNodeData } from "./campaign-nodes";

type SelectedNode = {
  id: string;
  data: CampaignNodeData;
};

type NodeConfigPanelProps = {
  node: SelectedNode | null;
  onUpdate: (nodeId: string, data: Partial<CampaignNodeData>) => void;
  onClose: () => void;
};

type Template = { id: string; name: string; subject: string };
type Tag = { id: string; name: string; color: string };
type SegmentItem = { id: string; name: string };

export function NodeConfigPanel({
  node,
  onUpdate,
  onClose,
}: NodeConfigPanelProps) {
  const [config, setConfig] = useState<Record<string, unknown>>({});
  const [label, setLabel] = useState("");
  const [templates, setTemplates] = useState<Template[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [segments, setSegments] = useState<SegmentItem[]>([]);

  useEffect(() => {
    if (node) {
      setConfig({ ...(node.data.config as Record<string, unknown>) });
      setLabel(node.data.label);
    }
  }, [node]);

  useEffect(() => {
    if (!node) return;
    Promise.all([
      fetch("/api/v1/emails")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/v1/tags")
        .then((r) => r.json())
        .catch(() => []),
      fetch("/api/v1/segments")
        .then((r) => r.json())
        .catch(() => []),
    ]).then(([t, tg, s]) => {
      setTemplates(Array.isArray(t) ? t : []);
      setTags(Array.isArray(tg) ? tg : []);
      setSegments(Array.isArray(s) ? s : []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]);

  const set = useCallback(
    (key: string, value: unknown) =>
      setConfig((prev) => ({ ...prev, [key]: value })),
    []
  );

  const handleApply = () => {
    if (!node) return;
    const updates: Partial<CampaignNodeData> = { label, config };
    if (config.actionType === "send_email" && config.templateId) {
      updates.templateId = config.templateId as string;
    }
    if (
      config.triggerType === "segment_entry" ||
      config.actionType === "add_to_segment"
    ) {
      updates.segmentId = (config.segmentId as string) || null;
    }
    onUpdate(node.id, updates);
    onClose();
  };

  return (
    <Sheet open={!!node} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="capitalize">
            Configure {node?.data.type.toLowerCase()} Node
          </SheetTitle>
          <SheetDescription>
            Set up the parameters for this workflow step.
          </SheetDescription>
        </SheetHeader>

        {node && (
          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="node-label">Label</Label>
              <Input
                id="node-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Node label..."
              />
            </div>

            <Separator />

            {node.data.type === "TRIGGER" && (
              <TriggerFields
                config={config}
                set={set}
                tags={tags}
                segments={segments}
              />
            )}
            {node.data.type === "CONDITION" && (
              <ConditionFields config={config} set={set} tags={tags} />
            )}
            {node.data.type === "ACTION" && (
              <ActionFields
                config={config}
                set={set}
                templates={templates}
                tags={tags}
                segments={segments}
              />
            )}
            {node.data.type === "DELAY" && (
              <DelayFields config={config} set={set} />
            )}

            <div className="flex gap-2 pt-4">
              <Button onClick={handleApply} className="flex-1">
                Apply Changes
              </Button>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

type FieldProps = {
  config: Record<string, unknown>;
  set: (k: string, v: unknown) => void;
};

function TriggerFields({
  config,
  set,
  tags,
  segments,
}: FieldProps & { tags: Tag[]; segments: SegmentItem[] }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Trigger Type</Label>
        <Select
          value={String(config.triggerType || "")}
          onValueChange={(v) => set("triggerType", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select trigger..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="form_submit">Form Submitted</SelectItem>
            <SelectItem value="segment_entry">Segment Entry</SelectItem>
            <SelectItem value="tag_added">Tag Added</SelectItem>
            <SelectItem value="date">Date / Schedule</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.triggerType === "segment_entry" && (
        <div className="space-y-2">
          <Label>Segment</Label>
          <Select
            value={String(config.segmentId || "")}
            onValueChange={(v) => set("segmentId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select segment..." />
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.triggerType === "tag_added" && (
        <div className="space-y-2">
          <Label>Tag</Label>
          <Select
            value={String(config.tagId || "")}
            onValueChange={(v) => set("tagId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tag..." />
            </SelectTrigger>
            <SelectContent>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.triggerType === "date" && (
        <div className="space-y-2">
          <Label>Date</Label>
          <Input
            type="datetime-local"
            value={String(config.date || "")}
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
      )}

      {config.triggerType === "webhook" && (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <p className="text-xs text-slate-500">
            A unique webhook URL will be generated when the campaign is
            activated.
          </p>
        </div>
      )}
    </div>
  );
}

function ConditionFields({
  config,
  set,
  tags,
}: FieldProps & { tags: Tag[] }) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Condition Type</Label>
        <Select
          value={String(config.conditionType || "")}
          onValueChange={(v) => set("conditionType", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select condition..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email_opened">Email Opened</SelectItem>
            <SelectItem value="score_threshold">Score Threshold</SelectItem>
            <SelectItem value="has_tag">Has Tag</SelectItem>
            <SelectItem value="custom_field">Custom Field</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.conditionType === "score_threshold" && (
        <div className="space-y-2">
          <Label>Minimum Score</Label>
          <Input
            type="number"
            value={String(config.scoreThreshold || "")}
            onChange={(e) =>
              set("scoreThreshold", parseInt(e.target.value) || 0)
            }
          />
        </div>
      )}

      {config.conditionType === "has_tag" && (
        <div className="space-y-2">
          <Label>Tag</Label>
          <Select
            value={String(config.tagId || "")}
            onValueChange={(v) => set("tagId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tag..." />
            </SelectTrigger>
            <SelectContent>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.conditionType === "custom_field" && (
        <>
          <div className="space-y-2">
            <Label>Field Name</Label>
            <Input
              value={String(config.fieldName || "")}
              onChange={(e) => set("fieldName", e.target.value)}
              placeholder="e.g. company"
            />
          </div>
          <div className="space-y-2">
            <Label>Expected Value</Label>
            <Input
              value={String(config.fieldValue || "")}
              onChange={(e) => set("fieldValue", e.target.value)}
              placeholder="Value to match..."
            />
          </div>
        </>
      )}
    </div>
  );
}

function ActionFields({
  config,
  set,
  templates,
  tags,
  segments,
}: FieldProps & {
  templates: Template[];
  tags: Tag[];
  segments: SegmentItem[];
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Action Type</Label>
        <Select
          value={String(config.actionType || "")}
          onValueChange={(v) => set("actionType", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select action..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="send_email">Send Email</SelectItem>
            <SelectItem value="add_tag">Add Tag</SelectItem>
            <SelectItem value="remove_tag">Remove Tag</SelectItem>
            <SelectItem value="update_score">Update Score</SelectItem>
            <SelectItem value="webhook">Call Webhook</SelectItem>
            <SelectItem value="add_to_segment">Add to Segment</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.actionType === "send_email" && (
        <div className="space-y-2">
          <Label>Email Template</Label>
          <Select
            value={String(config.templateId || "")}
            onValueChange={(v) => set("templateId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {(config.actionType === "add_tag" ||
        config.actionType === "remove_tag") && (
        <div className="space-y-2">
          <Label>Tag</Label>
          <Select
            value={String(config.tagId || "")}
            onValueChange={(v) => set("tagId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select tag..." />
            </SelectTrigger>
            <SelectContent>
              {tags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {config.actionType === "update_score" && (
        <div className="space-y-2">
          <Label>Score Points</Label>
          <Input
            type="number"
            value={String(config.points || "")}
            onChange={(e) => set("points", parseInt(e.target.value) || 0)}
            placeholder="e.g. 10 or -5"
          />
          <p className="text-xs text-slate-500">
            Use negative values to decrease the score.
          </p>
        </div>
      )}

      {config.actionType === "webhook" && (
        <div className="space-y-2">
          <Label>Webhook URL</Label>
          <Input
            value={String(config.webhookUrl || "")}
            onChange={(e) => set("webhookUrl", e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}

      {config.actionType === "add_to_segment" && (
        <div className="space-y-2">
          <Label>Segment</Label>
          <Select
            value={String(config.segmentId || "")}
            onValueChange={(v) => set("segmentId", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select segment..." />
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

function DelayFields({ config, set }: FieldProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Duration</Label>
        <Input
          type="number"
          min={1}
          value={String(config.duration || "")}
          onChange={(e) => set("duration", parseInt(e.target.value) || 0)}
          placeholder="Enter duration..."
        />
      </div>
      <div className="space-y-2">
        <Label>Unit</Label>
        <Select
          value={String(config.unit || "hours")}
          onValueChange={(v) => set("unit", v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="minutes">Minutes</SelectItem>
            <SelectItem value="hours">Hours</SelectItem>
            <SelectItem value="days">Days</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
