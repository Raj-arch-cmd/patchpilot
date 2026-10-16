import { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import type { VulnerabilityBrief, GraphData, GraphNode } from '../services/api';
import { DependencyGraph } from '../components/DependencyGraph';
import { SeverityBadge } from '../components/Badges';
import { Network, RefreshCw } from 'lucide-react';

export function GraphPage() {
  const [vulns, setVulns] = useState<VulnerabilityBrief[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  useEffect(() => {
    api.listVulnerabilities().then(setVulns).catch(console.error);
  }, []);

  const loadGraph = async (vulnId: string) => {
    if (!vulnId) return;
    setLoading(true);
    setError(null);
    setSelectedNode(null);
    try {
      const data = await api.getVulnGraph(vulnId);
      setGraphData(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load graph.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <Network size={16} style={{ color: 'var(--accent-primary)' }} />
          <span className="page-header-title">Dependency Graph</span>
        </div>
      </div>

      <div className="page-content">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h1 className="page-title">Dependency Graph</h1>
          <p className="page-subtitle">
            Explore the connected software dependency graph for any vulnerability.
            Nodes and edges are retrieved directly from FalkorDB.
          </p>
        </div>

        {/* Controls */}
        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="card-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
              <div className="form-group">
                <label htmlFor="graph-vuln-select" className="form-label">
                  Show subgraph for vulnerability
                </label>
                <select
                  id="graph-vuln-select"
                  className="form-select"
                  value={selectedId}
                  onChange={(e) => {
                    setSelectedId(e.target.value);
                    loadGraph(e.target.value);
                  }}
                >
                  <option value="">— Select a vulnerability —</option>
                  {vulns.map((v) => (
                    <option key={v.id} value={v.id}>
                      [{v.severity}] {v.title} ({v.id})
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-secondary"
                onClick={() => loadGraph(selectedId)}
                disabled={!selectedId || loading}
                aria-label="Reload graph"
              >
                <RefreshCw size={14} />
                Reload
              </button>
            </div>

            {selectedId && (
              <div style={{ marginTop: 'var(--space-3)' }}>
                {vulns.find((v) => v.id === selectedId) && (
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={vulns.find((v) => v.id === selectedId)!.severity} />
                    <span className="text-sm text-secondary">
                      {vulns.find((v) => v.id === selectedId)!.title}
                    </span>
                    {graphData && (
                      <span className="badge badge-green">
                        {graphData.nodes.length} nodes · {graphData.edges.length} edges
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Graph */}
        <DependencyGraph
          graphData={graphData}
          onNodeSelect={setSelectedNode}
          loading={loading}
          error={error}
          height={600}
        />

        {/* Node detail panel */}
        {selectedNode && (
          <div className="card" style={{ marginTop: 'var(--space-4)' }}>
            <div className="card-header">
              <div className="flex items-center gap-2">
                <span className={`path-node type-${selectedNode.type}`}>{selectedNode.type}</span>
                <span className="section-title">{selectedNode.label}</span>
              </div>
            </div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-3)' }}>
                {Object.entries(selectedNode.data).map(([k, v]) => (
                  <div key={k} className="factor-item">
                    <span className="factor-label">{k.replace(/_/g, ' ')}</span>
                    <span className="font-mono text-sm">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
