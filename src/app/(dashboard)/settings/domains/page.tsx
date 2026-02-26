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
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Check,
  X,
  Plus,
  RefreshCw,
  Trash2,
  ShieldCheck,
  Loader2,
  Flame,
  Copy,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";

interface DomainWarmup {
  id: string;
  enabled: boolean;
  currentDay: number;
  dailyTarget: number;
  rampPercentage: number;
  maxTarget: number;
  startedAt: string;
}

interface SendingDomain {
  id: string;
  domain: string;
  status: "PENDING" | "VERIFIED" | "FAILED" | "PAUSED";
  spfValid: boolean;
  dkimValid: boolean;
  dmarcValid: boolean;
  maxDailyVolume: number;
  dailySent: number;
  bounceRate: number;
  createdAt: string;
  warmup: DomainWarmup | null;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  VERIFIED: "bg-green-100 text-green-800 border-green-200",
  FAILED: "bg-red-100 text-red-800 border-red-200",
  PAUSED: "bg-orange-100 text-orange-800 border-orange-200",
};

function DnsIcon({ valid }: { valid: boolean }) {
  return valid ? (
    <Check className="h-4 w-4 text-green-600" />
  ) : (
    <X className="h-4 w-4 text-red-500" />
  );
}

function bounceColor(rate: number) {
  if (rate < 2) return "text-green-600";
  if (rate <= 5) return "text-yellow-600";
  return "text-red-600";
}

const SPF_INCLUDES: Record<string, string> = {
  SENDGRID: "include:sendgrid.net",
  AWS_SES: "include:amazonses.com",
  MAILGUN: "include:mailgun.org",
  POSTMARK: "include:spf.mtasv.net",
};

function getDnsRecords(domain: string) {
  return {
    spf: {
      type: "TXT",
      host: domain,
      value: `v=spf1 ${Object.values(SPF_INCLUDES).join(" ")} ~all`,
      note: "If you only use one provider, keep only its include. E.g. for SendGrid: v=spf1 include:sendgrid.net ~all",
    },
    dkim: {
      type: "TXT / CNAME",
      host: `<selector>._domainkey.${domain}`,
      value: "Provided by your email provider (SendGrid, AWS SES, etc.)",
      note: 'The selector name (e.g. "s1", "k1", "default") and value come from your provider\'s domain authentication settings.',
    },
    dmarc: {
      type: "TXT",
      host: `_dmarc.${domain}`,
      value: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain,
      note: 'Start with p=none to monitor. Change to p=quarantine or p=reject once confident.',
    },
  };
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
    >
      {copied ? (
        <CheckCheck className="h-3.5 w-3.5 text-green-600" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function DnsSetupGuide({ domain }: { domain: SendingDomain }) {
  const [open, setOpen] = useState(domain.status === "PENDING");
  const records = getDnsRecords(domain.domain);
  const hasMissing = !domain.spfValid || !domain.dkimValid || !domain.dmarcValid;

  if (!hasMissing) return null;

  const rows = [
    { key: "SPF", valid: domain.spfValid, ...records.spf },
    { key: "DKIM", valid: domain.dkimValid, ...records.dkim },
    { key: "DMARC", valid: domain.dmarcValid, ...records.dmarc },
  ].filter((r) => !r.valid);

  return (
    <div className="border-t">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          DNS Setup Guide — {rows.length} record{rows.length > 1 ? "s" : ""} missing
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="px-6 pb-5 space-y-4">
          <p className="text-xs text-muted-foreground">
            Add the following DNS records at your domain registrar (e.g. Cloudflare, Namecheap, Route53).
            After adding them, click <strong>Verify DNS</strong> above.
            DNS propagation can take up to 48 hours.
          </p>
          {rows.map((r) => (
            <div key={r.key} className="rounded-lg border bg-muted/30 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  {r.key}
                </Badge>
                <span className="text-xs text-muted-foreground">Record Type: <strong>{r.type}</strong></span>
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Host / Name</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background border px-3 py-1.5 text-xs font-mono break-all">
                      {r.host}
                    </code>
                    <CopyButton text={r.host} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Value</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded bg-background border px-3 py-1.5 text-xs font-mono break-all">
                      {r.value}
                    </code>
                    <CopyButton text={r.value} />
                  </div>
                </div>
              </div>
              {r.note && (
                <p className="text-xs text-muted-foreground italic">{r.note}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DomainsPage() {
  const [domains, setDomains] = useState<SendingDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [adding, setAdding] = useState(false);
  const [verifying, setVerifying] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/settings/domains");
      const json = await res.json();
      setDomains(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  async function handleAdd() {
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const res = await fetch("/api/v1/settings/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      if (res.ok) {
        setNewDomain("");
        setAddOpen(false);
        await fetchDomains();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleVerify(id: string) {
    setVerifying(id);
    try {
      await fetch(`/api/v1/settings/domains/${id}/verify`, { method: "POST" });
      await fetchDomains();
    } finally {
      setVerifying(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await fetch(`/api/v1/settings/domains/${id}`, { method: "DELETE" });
      await fetchDomains();
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
            <h1 className="text-2xl font-semibold tracking-tight">
              Domains & Deliverability
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Manage sending domains, DNS records, and warmup schedules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDomains}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1.5 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" />
                Add Domain
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Sending Domain</DialogTitle>
                <DialogDescription>
                  Enter the domain you want to send emails from. You&apos;ll
                  need to verify DNS records after adding it.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  placeholder="example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setAddOpen(false)}
                  disabled={adding}
                >
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={adding || !newDomain.trim()}>
                  {adding && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                  Add Domain
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading && domains.length === 0 ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : domains.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <ShieldCheck className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="font-medium">No sending domains configured</p>
            <p className="text-muted-foreground text-sm mt-1">
              Add a domain to start sending emails with verified deliverability.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {domains.map((d) => {
            const volumePct =
              d.maxDailyVolume > 0
                ? Math.min(100, (d.dailySent / d.maxDailyVolume) * 100)
                : 0;
            const warmupPct =
              d.warmup && d.warmup.maxTarget > 0
                ? Math.min(
                    100,
                    (d.warmup.dailyTarget / d.warmup.maxTarget) * 100
                  )
                : 0;

            return (
              <Card key={d.id}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CardTitle className="text-lg">{d.domain}</CardTitle>
                    <Badge
                      variant="outline"
                      className={STATUS_STYLES[d.status]}
                    >
                      {d.status}
                    </Badge>
                  </div>
                  <CardAction>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVerify(d.id)}
                        disabled={verifying === d.id}
                      >
                        {verifying === d.id ? (
                          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                        ) : (
                          <ShieldCheck className="mr-1.5 h-4 w-4" />
                        )}
                        Verify DNS
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(d.id)}
                        disabled={deleting === d.id}
                      >
                        {deleting === d.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardAction>
                </CardHeader>

                <CardContent>
                  <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                    {/* DNS Checks */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        DNS Records
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 text-sm">
                          <DnsIcon valid={d.spfValid} />
                          <span>SPF</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DnsIcon valid={d.dkimValid} />
                          <span>DKIM</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DnsIcon valid={d.dmarcValid} />
                          <span>DMARC</span>
                        </div>
                      </div>
                    </div>

                    {/* Daily Volume */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Daily Volume
                      </p>
                      <p className="text-sm font-medium">
                        {d.dailySent.toLocaleString()} /{" "}
                        {d.maxDailyVolume.toLocaleString()}
                      </p>
                      <Progress value={volumePct} className="h-1.5" />
                    </div>

                    {/* Bounce Rate */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Bounce Rate
                      </p>
                      <p className={`text-lg font-semibold ${bounceColor(d.bounceRate)}`}>
                        {d.bounceRate.toFixed(2)}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {d.bounceRate < 2
                          ? "Healthy"
                          : d.bounceRate <= 5
                            ? "Needs attention"
                            : "Critical"}
                      </p>
                    </div>

                    {/* Warmup Status */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Warmup
                      </p>
                      {d.warmup ? (
                        <>
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Flame className="h-4 w-4 text-orange-500" />
                            Day {d.warmup.currentDay}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Target: {d.warmup.dailyTarget.toLocaleString()} /{" "}
                            {d.warmup.maxTarget.toLocaleString()} emails/day
                          </p>
                          <Progress value={warmupPct} className="h-1.5" />
                        </>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No warmup configured
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
                <DnsSetupGuide domain={d} />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
