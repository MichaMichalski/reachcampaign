"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Play,
  Pause,
  Square,
  Loader2,
  Users,
  CheckCircle,
  XCircle,
  Clock,
} from "lucide-react";
import {
  CampaignEditor,
  type SaveNode,
  type SaveEdge,
} from "@/components/builders/campaign-editor";
import { formatDateTime } from "@/lib/utils";

type CampaignDetailProps = {
  campaign: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    nodes: {
      id: string;
      type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY";
      label: string;
      config: unknown;
      positionX: number;
      positionY: number;
      templateId: string | null;
      segmentId: string | null;
    }[];
    edges: {
      id: string;
      sourceNodeId: string;
      targetNodeId: string;
      label: string | null;
    }[];
    logs: {
      id: string;
      status: string;
      createdAt: string;
      contact: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
      };
      node: { id: string; label: string; type: string };
    }[];
  };
  stats: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
};

const statusColors: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  PAUSED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-blue-100 text-blue-700",
};

const logStatusColors: Record<string, string> = {
  PENDING: "bg-slate-100 text-slate-600",
  PROCESSING: "bg-blue-100 text-blue-600",
  COMPLETED: "bg-emerald-100 text-emerald-600",
  FAILED: "bg-red-100 text-red-600",
  SKIPPED: "bg-amber-100 text-amber-600",
};

export function CampaignDetail({ campaign, stats }: CampaignDetailProps) {
  const router = useRouter();
  const [statusLoading, setStatusLoading] = useState<string | null>(null);

  const handleStatusAction = async (action: "start" | "pause" | "stop") => {
    setStatusLoading(action);
    try {
      await fetch(`/api/v1/campaigns/${campaign.id}/${action}`, {
        method: "POST",
      });
      router.refresh();
    } finally {
      setStatusLoading(null);
    }
  };

  const handleSave = async (nodes: SaveNode[], edges: SaveEdge[]) => {
    const res = await fetch(`/api/v1/campaigns/${campaign.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nodes, edges }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to save");
    }

    router.refresh();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex items-center justify-between pt-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">Status:</span>
            <Badge
              className={statusColors[campaign.status] || ""}
              variant="secondary"
            >
              {campaign.status}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {(campaign.status === "DRAFT" ||
              campaign.status === "PAUSED") && (
              <Button
                size="sm"
                onClick={() => handleStatusAction("start")}
                disabled={statusLoading !== null}
              >
                {statusLoading === "start" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {campaign.status === "PAUSED" ? "Resume" : "Start"}
              </Button>
            )}
            {campaign.status === "ACTIVE" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusAction("pause")}
                disabled={statusLoading !== null}
              >
                {statusLoading === "pause" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Pause className="h-4 w-4" />
                )}
                Pause
              </Button>
            )}
            {campaign.status !== "COMPLETED" && (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleStatusAction("stop")}
                disabled={statusLoading !== null}
              >
                {statusLoading === "stop" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-400" />
              <span className="text-2xl font-bold text-slate-900">
                {stats.total}
              </span>
            </div>
            <p className="text-xs text-slate-500">Total Processed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-2xl font-bold text-slate-900">
                {stats.completed}
              </span>
            </div>
            <p className="text-xs text-slate-500">Completed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-2xl font-bold text-slate-900">
                {stats.failed}
              </span>
            </div>
            <p className="text-xs text-slate-500">Failed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-2xl font-bold text-slate-900">
                {stats.pending}
              </span>
            </div>
            <p className="text-xs text-slate-500">Waiting</p>
          </CardContent>
        </Card>
      </div>

      <CampaignEditor
        campaignId={campaign.id}
        initialNodes={campaign.nodes}
        initialEdges={campaign.edges}
        onSave={handleSave}
      />

      {campaign.logs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Execution Logs</CardTitle>
            <CardDescription>
              Showing the latest {campaign.logs.length} log entries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Contact</TableHead>
                    <TableHead>Node</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {log.contact.email}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.node.label}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={logStatusColors[log.status] || ""}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-500">
                        {formatDateTime(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
