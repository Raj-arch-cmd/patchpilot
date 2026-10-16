import { useCallback, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphData, GraphNode as ApiGraphNode } from '../services/api';

// ---- Node type colors ----
const NODE_TYPE_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  Vulnerability: { bg: '#FDEEEC', border: '#F0B8B1', text: '#C0392B', label: 'VULN' },
  Package: { bg: '#EBF3FD', border: '#B0D0F5', text: '#1A5EA8', label: 'PKG' },
  Application: { bg: '#DDF3E8', border: '#A8DFC9', text: '#168568', label: 'APP' },
  Asset: { bg: '#F3EBFD', border: '#D0B0F0', text: '#7B3FA0', label: 'ASSET' },
  Team: { bg: '#FEF0E6', border: '#F5C49A', text: '#D4691A', label: 'TEAM' },
};

// ---- Custom Node Component ----
function PatchNode({ data, selected }: NodeProps) {
  const cfg = NODE_TYPE_COLORS[(data as any).nodeType] || NODE_TYPE_COLORS.Package;
  return (
    <div
      style={{
        background: cfg.bg,
        border: `1.5px solid ${selected ? '#168568' : cfg.border}`,
        borderRadius: 8,
        padding: '8px 12px',
        minWidth: 120,
        maxWidth: 180,
        boxShadow: selected
          ? '0 0 0 2px #DDF3E8, 0 2px 8px rgba(0,0,0,0.08)'
          : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: 'pointer',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: cfg.text,
          textTransform: 'uppercase',
          letterSpacing: '0.6px',
          marginBottom: 3,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {cfg.label}
      </div>
      <div
        style={{
          fontSize: 12,
          fontWeight: 500,
          color: '#292D2A',
          wordBreak: 'break-word',
          lineHeight: 1.3,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        {String((data as any).label || '')}
      </div>
      {(data as any).sub && (
        <div style={{ fontSize: 10, color: '#9BA09C', marginTop: 2 }}>
          {String((data as any).sub)}
        </div>
      )}
    </div>
  );
}

const nodeTypes = { patchNode: PatchNode };

// ---- Layout helper (simple layered layout) ----
function layoutNodes(apiNodes: ApiGraphNode[]): Record<string, { x: number; y: number }> {
  const order = ['Vulnerability', 'Package', 'Application', 'Asset', 'Team'];
  const byType: Record<string, ApiGraphNode[]> = {};
  for (const n of apiNodes) {
    (byType[n.type] = byType[n.type] || []).push(n);
  }

  const positions: Record<string, { x: number; y: number }> = {};
  const X_GAP = 280;
  const Y_GAP = 110;

  order.forEach((type, col) => {
    const nodes = byType[type] || [];
    nodes.forEach((n, row) => {
      positions[n.id] = {
        x: col * X_GAP,
        y: row * Y_GAP - ((nodes.length - 1) * Y_GAP) / 2,
      };
    });
  });

  // Remaining types
  let extraCol = order.length;
  for (const [type, nodes] of Object.entries(byType)) {
    if (!order.includes(type)) {
      nodes.forEach((n, row) => {
        positions[n.id] = { x: extraCol * X_GAP, y: row * Y_GAP };
      });
      extraCol++;
    }
  }

  return positions;
}

// ---- Main Graph Component ----
interface DependencyGraphProps {
  graphData: GraphData | null;
  highlightNodeIds?: string[];
  onNodeSelect?: (node: ApiGraphNode | null) => void;
  loading?: boolean;
  error?: string | null;
  height?: number;
}

export function DependencyGraph({
  graphData,
  highlightNodeIds = [],
  onNodeSelect,
  loading = false,
  error = null,
  height = 520,
}: DependencyGraphProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!graphData) return;

    const positions = layoutNodes(graphData.nodes);

    const flowNodes: Node[] = graphData.nodes.map((n) => ({
      id: n.id,
      type: 'patchNode',
      position: positions[n.id] || { x: 0, y: 0 },
      data: {
        label: n.label,
        nodeType: n.type,
        sub: n.data?.version ? `v${n.data.version}` : undefined,
        ...n.data,
      },
      selected: selectedId === n.id,
    }));

    const flowEdges: Edge[] = graphData.edges.map((e, i) => ({
      id: `e-${i}-${e.source}-${e.target}`,
      source: e.source,
      target: e.target,
      label: e.label,
      labelStyle: { fontSize: 10, fill: '#9BA09C', fontFamily: 'Inter, sans-serif' },
      labelBgStyle: { fill: '#F8F7F2', fillOpacity: 0.9 },
      style: {
        stroke: highlightNodeIds.includes(e.source) && highlightNodeIds.includes(e.target)
          ? '#168568'
          : '#CECCC4',
        strokeWidth: highlightNodeIds.includes(e.source) && highlightNodeIds.includes(e.target) ? 2 : 1.5,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#CECCC4',
        width: 10,
        height: 10,
      },
      animated: highlightNodeIds.includes(e.source) && highlightNodeIds.includes(e.target),
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [graphData, selectedId, highlightNodeIds]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedId(node.id);
      if (onNodeSelect && graphData) {
        const apiNode = graphData.nodes.find((n) => n.id === node.id) || null;
        onNodeSelect(apiNode);
      }
    },
    [graphData, onNodeSelect]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedId(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  if (loading) {
    return (
      <div
        className="graph-container state-container"
        style={{ height }}
      >
        <div className="spinner spinner-lg" />
        <span className="state-sub">Loading graph data…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="graph-container state-container" style={{ height }}>
        <div className="state-icon" style={{ background: 'var(--sev-critical-bg)' }}>
          ⚠
        </div>
        <span className="state-title">Graph error</span>
        <span className="state-sub">{error}</span>
      </div>
    );
  }

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <div className="graph-container state-container" style={{ height }}>
        <div className="state-icon">🔍</div>
        <span className="state-title">No graph data</span>
        <span className="state-sub">Run an investigation to see the dependency graph.</span>
      </div>
    );
  }

  return (
    <div className="graph-container" style={{ height }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background color="#E7E6DE" gap={20} variant={BackgroundVariant.Dots} size={1.5} />
        <Controls position="bottom-right" />
        <MiniMap
          nodeColor={(n) => {
            const type = String(n.data?.nodeType || 'Package');
            return NODE_TYPE_COLORS[type]?.border || '#CECCC4';
          }}
          maskColor="rgba(248,247,242,0.7)"
          position="bottom-left"
        />
      </ReactFlow>

      {/* Legend */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '8px 12px',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Legend
        </span>
        {Object.entries(NODE_TYPE_COLORS).map(([type, cfg]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: cfg.bg, border: `1.5px solid ${cfg.border}`, flexShrink: 0 }} />
            {type}
          </div>
        ))}
      </div>
    </div>
  );
}
