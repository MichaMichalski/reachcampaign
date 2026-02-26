"use client";

import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Edge,
  type Connection,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Button } from "@/components/ui/button";
import { Zap, GitBranch, Cog, Clock, Save, Loader2, Plus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  campaignNodeTypes,
  type CampaignNodeData,
  type CampaignFlowNode,
} from "./campaign-nodes";
import { NodeConfigPanel } from "./node-config-panel";

export type SaveNode = {
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY";
  label: string;
  config: Record<string, unknown>;
  positionX: number;
  positionY: number;
  templateId?: string | null;
  segmentId?: string | null;
};

export type SaveEdge = {
  sourceNodeIndex: number;
  targetNodeIndex: number;
  label?: string;
};

type CampaignNodeRecord = {
  id: string;
  type: "TRIGGER" | "CONDITION" | "ACTION" | "DELAY";
  label: string;
  config: unknown;
  positionX: number;
  positionY: number;
  templateId?: string | null;
  segmentId?: string | null;
};

type CampaignEdgeRecord = {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  label?: string | null;
};

type CampaignEditorProps = {
  campaignId: string;
  initialNodes: CampaignNodeRecord[];
  initialEdges: CampaignEdgeRecord[];
  onSave: (nodes: SaveNode[], edges: SaveEdge[]) => Promise<void>;
};

function toFlowNodes(records: CampaignNodeRecord[]): CampaignFlowNode[] {
  return records.map((n) => ({
    id: n.id,
    type: n.type.toLowerCase(),
    position: { x: n.positionX, y: n.positionY },
    data: {
      type: n.type,
      label: n.label,
      config: (n.config as Record<string, unknown>) || {},
      templateId: n.templateId,
      segmentId: n.segmentId,
    },
  }));
}

function toFlowEdges(records: CampaignEdgeRecord[]): Edge[] {
  return records.map((e) => ({
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
    label: e.label || undefined,
    animated: true,
    style: e.label === "Yes"
      ? { stroke: "#22c55e", strokeWidth: 2 }
      : e.label === "No"
        ? { stroke: "#ef4444", strokeWidth: 2 }
        : { strokeWidth: 2 },
  }));
}

const nodeDefaults: Record<
  CampaignNodeData["type"],
  { label: string; icon: typeof Zap }
> = {
  TRIGGER: { label: "New Trigger", icon: Zap },
  CONDITION: { label: "New Condition", icon: GitBranch },
  ACTION: { label: "New Action", icon: Cog },
  DELAY: { label: "New Delay", icon: Clock },
};

export function CampaignEditor({
  initialNodes,
  initialEdges,
  onSave,
}: CampaignEditorProps) {
  const flowNodes = useMemo(() => toFlowNodes(initialNodes), [initialNodes]);
  const flowEdges = useMemo(() => toFlowEdges(initialEdges), [initialEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    data: CampaignNodeData;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const sourceNode = nodes.find((n) => n.id === connection.source);
      let label: string | undefined;
      let style: React.CSSProperties = { strokeWidth: 2 };

      if (sourceNode?.data.type === "CONDITION") {
        if (connection.sourceHandle === "true") {
          label = "Yes";
          style = { ...style, stroke: "#22c55e" };
        } else if (connection.sourceHandle === "false") {
          label = "No";
          style = { ...style, stroke: "#ef4444" };
        }
      }

      const newEdge: Edge = {
        id: `e-${connection.source}-${connection.target}-${Date.now()}`,
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
        label,
        style,
        animated: true,
      };

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [nodes, setEdges]
  );

  const addNode = useCallback(
    (type: CampaignNodeData["type"]) => {
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
      const newNode: CampaignFlowNode = {
        id: `node-${Date.now()}`,
        type: type.toLowerCase(),
        position: { x: 250, y: maxY + 150 },
        data: {
          type,
          label: nodeDefaults[type].label,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes, setNodes]
  );

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const flowNode = node as CampaignFlowNode;
      setSelectedNode({ id: flowNode.id, data: flowNode.data });
    },
    []
  );

  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<CampaignNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === nodeId ? { ...n, data: { ...n.data, ...updates } } : n
        )
      );
    },
    [setNodes]
  );

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const saveNodes: SaveNode[] = nodes.map((n) => ({
        type: n.data.type,
        label: n.data.label,
        config: n.data.config,
        positionX: n.position.x,
        positionY: n.position.y,
        templateId: n.data.templateId || null,
        segmentId: n.data.segmentId || null,
      }));

      const nodeIdToIndex = new Map(nodes.map((n, i) => [n.id, i]));

      const saveEdges: SaveEdge[] = edges
        .filter(
          (e) => nodeIdToIndex.has(e.source) && nodeIdToIndex.has(e.target)
        )
        .map((e) => ({
          sourceNodeIndex: nodeIdToIndex.get(e.source)!,
          targetNodeIndex: nodeIdToIndex.get(e.target)!,
          label: typeof e.label === "string" ? e.label : undefined,
        }));

      await onSave(saveNodes, saveEdges);
    } finally {
      setSaving(false);
    }
  }, [nodes, edges, onSave]);

  return (
    <div className="flex h-[600px] flex-col overflow-hidden rounded-xl border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b bg-slate-50 px-4 py-2">
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4" />
                Add Node
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {(
                Object.entries(nodeDefaults) as [
                  CampaignNodeData["type"],
                  (typeof nodeDefaults)[CampaignNodeData["type"]],
                ][]
              ).map(([type, { label, icon: Icon }]) => (
                <DropdownMenuItem key={type} onClick={() => addNode(type)}>
                  <Icon className="mr-2 h-4 w-4" />
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {saving ? "Saving..." : "Save Workflow"}
        </Button>
      </div>

      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={campaignNodeTypes}
          defaultEdgeOptions={{
            animated: true,
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          }}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          className="bg-slate-50"
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Background gap={20} size={1} color="#e2e8f0" />
          <Controls className="!border !border-slate-200 !bg-white !shadow-sm" />
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as CampaignNodeData;
              switch (data.type) {
                case "TRIGGER":
                  return "#34d399";
                case "CONDITION":
                  return "#fbbf24";
                case "ACTION":
                  return "#60a5fa";
                case "DELAY":
                  return "#94a3b8";
                default:
                  return "#cbd5e1";
              }
            }}
            className="!border !border-slate-200 !bg-white !shadow-sm"
          />
        </ReactFlow>
      </div>

      <NodeConfigPanel
        node={selectedNode}
        onUpdate={handleNodeUpdate}
        onClose={() => setSelectedNode(null)}
      />
    </div>
  );
}
