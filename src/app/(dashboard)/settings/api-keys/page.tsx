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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Loader2,
  Key,
  Copy,
  Check,
  AlertTriangle,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";

interface ApiKey {
  id: string;
  name: string;
  maskedKey: string;
  lastUsed: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings/api-keys");
      const json = await res.json();
      setKeys(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  function openCreate() {
    setName("");
    setExpiresAt("");
    setNewKey(null);
    setCopied(false);
    setCreateOpen(true);
  }

  function closeDialog() {
    setCreateOpen(false);
    setNewKey(null);
    setCopied(false);
    setName("");
    setExpiresAt("");
  }

  async function handleCreate() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      const payload: { name: string; expiresAt?: string } = {
        name: name.trim(),
      };
      if (expiresAt) payload.expiresAt = new Date(expiresAt).toISOString();

      const res = await fetch("/api/v1/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const json = await res.json();
        setNewKey(json.key);
        await fetchKeys();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleCopy() {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/v1/settings/api-keys/${id}`, { method: "DELETE" });
      await fetchKeys();
    } finally {
      setDeleting(null);
    }
  }

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
            <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Create and manage API keys for programmatic access.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1.5 h-4 w-4" />
          Create API Key
        </Button>
      </div>

      {/* Create / Reveal Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => !open && closeDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newKey ? "API Key Created" : "Create API Key"}
            </DialogTitle>
            <DialogDescription>
              {newKey
                ? "Copy your API key now. It will not be shown again."
                : "Give your key a name and optional expiration date."}
            </DialogDescription>
          </DialogHeader>

          {newKey ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  This is the only time the full key will be displayed. Store it
                  securely.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={newKey}
                  className="font-mono text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeDialog}>Done</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyName">Name</Label>
                  <Input
                    id="keyName"
                    placeholder="e.g. Production API"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keyExpiry">Expiration (optional)</Label>
                  <Input
                    id="keyExpiry"
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={closeDialog}
                  disabled={creating}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={creating || !name.trim()}
                >
                  {creating && (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  )}
                  Create Key
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Key List */}
      {loading && keys.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : keys.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Key className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No API keys</p>
            <p className="text-muted-foreground text-sm mt-1">
              Create an API key to access the platform programmatically.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <div className="divide-y">
              {keys.map((k) => (
                <div
                  key={k.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {k.maskedKey}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>Created {formatDateTime(k.createdAt)}</span>
                      {k.lastUsed && (
                        <span>Last used {formatDateTime(k.lastUsed)}</span>
                      )}
                      {k.expiresAt && (
                        <span>
                          Expires {formatDateTime(k.expiresAt)}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(k.id)}
                    disabled={deleting === k.id}
                  >
                    {deleting === k.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
