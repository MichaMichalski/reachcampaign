"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  Pencil,
  Trash2,
  Loader2,
  Mail,
} from "lucide-react";

type ProviderType = "SMTP" | "SENDGRID" | "AWS_SES" | "MAILGUN" | "POSTMARK";
type Strategy = "ROUND_ROBIN" | "WEIGHTED" | "FAILOVER";

interface EmailProvider {
  id: string;
  name: string;
  type: ProviderType;
  config: Record<string, unknown>;
  weight: number;
  priority: number;
  enabled: boolean;
  strategy: Strategy;
  dailyLimit: number;
  hourlylimit: number;
  dailySent: number;
  createdAt: string;
}

const PROVIDER_TYPES: { value: ProviderType; label: string }[] = [
  { value: "SMTP", label: "SMTP" },
  { value: "SENDGRID", label: "SendGrid" },
  { value: "AWS_SES", label: "AWS SES" },
  { value: "MAILGUN", label: "Mailgun" },
  { value: "POSTMARK", label: "Postmark" },
];

const STRATEGIES: { value: Strategy; label: string }[] = [
  { value: "ROUND_ROBIN", label: "Round Robin" },
  { value: "WEIGHTED", label: "Weighted" },
  { value: "FAILOVER", label: "Failover" },
];

const CONFIG_FIELDS: Record<ProviderType, { key: string; label: string; type: string }[]> = {
  SMTP: [
    { key: "host", label: "Host", type: "text" },
    { key: "port", label: "Port", type: "number" },
    { key: "username", label: "Username", type: "text" },
    { key: "password", label: "Password", type: "password" },
    { key: "secure", label: "Secure (TLS)", type: "boolean" },
  ],
  SENDGRID: [{ key: "apiKey", label: "API Key", type: "password" }],
  AWS_SES: [
    { key: "region", label: "Region", type: "text" },
    { key: "accessKeyId", label: "Access Key ID", type: "text" },
    { key: "secretAccessKey", label: "Secret Access Key", type: "password" },
  ],
  MAILGUN: [
    { key: "apiKey", label: "API Key", type: "password" },
    { key: "domain", label: "Domain", type: "text" },
  ],
  POSTMARK: [{ key: "serverToken", label: "Server Token", type: "password" }],
};

const TYPE_STYLES: Record<ProviderType, string> = {
  SMTP: "bg-blue-100 text-blue-800 border-blue-200",
  SENDGRID: "bg-indigo-100 text-indigo-800 border-indigo-200",
  AWS_SES: "bg-orange-100 text-orange-800 border-orange-200",
  MAILGUN: "bg-red-100 text-red-800 border-red-200",
  POSTMARK: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const STRATEGY_STYLES: Record<Strategy, string> = {
  ROUND_ROBIN: "bg-purple-100 text-purple-800 border-purple-200",
  WEIGHTED: "bg-cyan-100 text-cyan-800 border-cyan-200",
  FAILOVER: "bg-gray-100 text-gray-800 border-gray-200",
};

interface FormState {
  name: string;
  type: ProviderType;
  strategy: Strategy;
  config: Record<string, unknown>;
  weight: number;
  priority: number;
  dailyLimit: number;
  hourlyLimit: number;
}

const emptyForm: FormState = {
  name: "",
  type: "SMTP",
  strategy: "ROUND_ROBIN",
  config: {},
  weight: 1,
  priority: 0,
  dailyLimit: 10000,
  hourlyLimit: 500,
};

export default function ProvidersPage() {
  const [providers, setProviders] = useState<EmailProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings/providers");
      const json = await res.json();
      setProviders(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function openAdd() {
    setForm(emptyForm);
    setEditId(null);
    setAddOpen(true);
  }

  function openEdit(p: EmailProvider) {
    setForm({
      name: p.name,
      type: p.type,
      strategy: p.strategy,
      config: p.config,
      weight: p.weight,
      priority: p.priority,
      dailyLimit: p.dailyLimit,
      hourlyLimit: p.hourlylimit,
    });
    setEditId(p.id);
    setAddOpen(true);
  }

  function closeDialog() {
    setAddOpen(false);
    setEditId(null);
    setForm(emptyForm);
  }

  function setConfigField(key: string, value: unknown) {
    setForm((prev) => ({ ...prev, config: { ...prev.config, [key]: value } }));
  }

  async function handleSubmit() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        strategy: form.strategy,
        config: form.config,
        weight: form.weight,
        priority: form.priority,
        dailyLimit: form.dailyLimit,
        hourlyLimit: form.hourlyLimit,
      };

      const url = editId
        ? `/api/v1/settings/providers/${editId}`
        : "/api/v1/settings/providers";
      const method = editId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        closeDialog();
        await fetchProviders();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggle(p: EmailProvider) {
    setToggling(p.id);
    try {
      await fetch(`/api/v1/settings/providers/${p.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !p.enabled }),
      });
      await fetchProviders();
    } finally {
      setToggling(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/v1/settings/providers/${id}`, { method: "DELETE" });
      await fetchProviders();
    } finally {
      setDeleting(null);
    }
  }

  const configFields = CONFIG_FIELDS[form.type] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/settings">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Settings
            </Link>
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Email Providers
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Configure email sending providers and routing strategies.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchProviders}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add Provider
          </Button>
        </div>
      </div>

      {/* Provider Form Dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editId ? "Edit Provider" : "Add Email Provider"}
            </DialogTitle>
            <DialogDescription>
              {editId
                ? "Update provider configuration. Sensitive fields show masked values — leave blank to keep existing."
                : "Configure a new email sending provider."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="My SMTP Server"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      type: v as ProviderType,
                      config: {},
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Strategy</Label>
                <Select
                  value={form.strategy}
                  onValueChange={(v) =>
                    setForm((prev) => ({
                      ...prev,
                      strategy: v as Strategy,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STRATEGIES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            <p className="text-sm font-medium">
              Provider Configuration
            </p>
            {configFields.map((field) =>
              field.type === "boolean" ? (
                <div
                  key={field.key}
                  className="flex items-center justify-between"
                >
                  <Label>{field.label}</Label>
                  <Switch
                    checked={!!form.config[field.key]}
                    onCheckedChange={(v) => setConfigField(field.key, v)}
                  />
                </div>
              ) : (
                <div key={field.key} className="space-y-2">
                  <Label>{field.label}</Label>
                  <Input
                    type={field.type}
                    value={(form.config[field.key] as string) ?? ""}
                    onChange={(e) =>
                      setConfigField(
                        field.key,
                        field.type === "number"
                          ? Number(e.target.value)
                          : e.target.value
                      )
                    }
                    placeholder={field.label}
                  />
                </div>
              )
            )}

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Weight</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.weight}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      weight: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.priority}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      priority: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.dailyLimit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      dailyLimit: Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Hourly Limit</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.hourlyLimit}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      hourlyLimit: Number(e.target.value),
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || !form.name.trim()}
            >
              {submitting && (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              )}
              {editId ? "Save Changes" : "Add Provider"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Provider List */}
      {loading && providers.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Mail className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No email providers configured</p>
            <p className="text-muted-foreground text-sm mt-1">
              Add a provider to start sending emails.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {providers.map((p) => {
            const usagePct =
              p.dailyLimit > 0
                ? Math.min(100, (p.dailySent / p.dailyLimit) * 100)
                : 0;

            return (
              <Card key={p.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    <Badge
                      variant="outline"
                      className={TYPE_STYLES[p.type]}
                    >
                      {PROVIDER_TYPES.find((t) => t.value === p.type)?.label ??
                        p.type}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={STRATEGY_STYLES[p.strategy]}
                    >
                      {STRATEGIES.find((s) => s.value === p.strategy)?.label ??
                        p.strategy}
                    </Badge>
                  </div>
                  <CardAction>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {p.enabled ? "Enabled" : "Disabled"}
                        </span>
                        <Switch
                          checked={p.enabled}
                          disabled={toggling === p.id}
                          onCheckedChange={() => handleToggle(p)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEdit(p)}
                      >
                        <Pencil className="mr-1.5 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(p.id)}
                        disabled={deleting === p.id}
                      >
                        {deleting === p.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Weight / Priority
                      </p>
                      <p className="text-sm">
                        Weight: <span className="font-medium">{p.weight}</span>
                        {" · "}
                        Priority:{" "}
                        <span className="font-medium">{p.priority}</span>
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Daily Usage
                      </p>
                      <p className="text-sm font-medium">
                        {p.dailySent.toLocaleString()} /{" "}
                        {p.dailyLimit.toLocaleString()}
                      </p>
                      <Progress value={usagePct} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Hourly Limit
                      </p>
                      <p className="text-sm font-medium">
                        {p.hourlylimit.toLocaleString()} emails/hr
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
