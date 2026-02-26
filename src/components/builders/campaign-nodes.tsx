"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { Zap, GitBranch, Cog, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type CampaignNodeData = {
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY";
  label: string;
  config: Record<string, unknown>;
  templateId?: string | null;
  segmentId?: string | null;
};

export type CampaignFlowNode = Node<CampaignNodeData>;

const themes = {
  TRIGGER: {
    border: "border-emerald-400",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-700",
    ring: "ring-emerald-300",
    Icon: Zap,
  },
  CONDITION: {
    border: "border-amber-400",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-600",
    badge: "bg-amber-100 text-amber-700",
    ring: "ring-amber-300",
    Icon: GitBranch,
  },
  ACTION: {
    border: "border-blue-400",
    iconBg: "bg-blue-100",
    iconColor: "text-blue-600",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-300",
    Icon: Cog,
  },
  DELAY: {
    border: "border-slate-300",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
    badge: "bg-slate-100 text-slate-600",
    ring: "ring-slate-300",
    Icon: Clock,
  },
};

function getConfigSummary(data: CampaignNodeData): string | null {
  const { config } = data;
  switch (data.type) {
    case "TRIGGER":
      return config.triggerType
        ? String(config.triggerType).replace(/_/g, " ")
        : null;
    case "CONDITION":
      return config.conditionType
        ? `If: ${String(config.conditionType).replace(/_/g, " ")}`
        : null;
    case "ACTION":
      return config.actionType
        ? String(config.actionType).replace(/_/g, " ")
        : null;
    case "DELAY":
      return config.duration
        ? `Wait ${config.duration} ${config.unit || "hours"}`
        : null;
    default:
      return null;
  }
}

function WorkflowNode({ data, selected }: NodeProps<CampaignFlowNode>) {
  const theme = themes[data.type];
  const { Icon } = theme;
  const summary = getConfigSummary(data);
  const isCondition = data.type === "CONDITION";

  return (
    <div
      className={cn(
        "min-w-[200px] max-w-[240px] rounded-xl border-2 bg-white shadow-sm transition-all",
        theme.border,
        selected && `shadow-lg ring-2 ${theme.ring}`
      )}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-400"
      />

      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              theme.iconBg
            )}
          >
            <Icon className={cn("h-4 w-4", theme.iconColor)} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {data.label}
            </p>
            <span
              className={cn(
                "mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                theme.badge
              )}
            >
              {data.type}
            </span>
          </div>
        </div>

        {summary && (
          <p className="mt-2 truncate border-t border-slate-100 pt-2 text-xs text-slate-500">
            {summary}
          </p>
        )}
      </div>

      {isCondition ? (
        <>
          <Handle
            type="source"
            position={Position.Bottom}
            id="true"
            style={{ left: "30%" }}
            className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-emerald-500"
          />
          <Handle
            type="source"
            position={Position.Bottom}
            id="false"
            style={{ left: "70%" }}
            className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-red-400"
          />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!h-3 !w-3 !rounded-full !border-2 !border-white !bg-slate-400"
        />
      )}
    </div>
  );
}

export const TriggerNode = memo(WorkflowNode);
TriggerNode.displayName = "TriggerNode";

export const ConditionNode = memo(WorkflowNode);
ConditionNode.displayName = "ConditionNode";

export const ActionNode = memo(WorkflowNode);
ActionNode.displayName = "ActionNode";

export const DelayNode = memo(WorkflowNode);
DelayNode.displayName = "DelayNode";

export const campaignNodeTypes = {
  trigger: TriggerNode,
  condition: ConditionNode,
  action: ActionNode,
  delay: DelayNode,
};
