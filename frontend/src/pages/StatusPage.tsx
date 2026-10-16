import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { HealthResponse } from '../services/api';
import { CheckCircle, XCircle, AlertTriangle, Database, Zap, RefreshCw, Play } from 'lucide-react';

export function StatusPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadHealth = async () => {
    setLoading(true);
    try {
      const h = await api.health();
      setHealth(h);
      setError(null);
    } catch {
      setError('Backend is not reachable. Make sure it is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeed = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await api.seed(false);
      setSeedResult(`Seeded: ${JSON.stringify(res.counts)}`);
    } catch (err) {
      setSeedResult(`Error: ${err}`);
    } finally {
      setSeedLoading(false);
    }
  };

  const handleReseed = async () => {
    setSeedLoading(true);
    setSeedResult(null);
    try {
      const res = await api.seed(true);
      setSeedResult(`Re-seeded (fresh): ${JSON.stringify(res.counts)}`);
    } catch (err) {
      setSeedResult(`Error: ${err}`);
    } finally {
      setSeedLoading(false);
    }
  };

  useEffect(() => { loadHealth(); }, []);

  const StatusRow = ({ label, value, ok }: { label: string; value: string; ok: boolean }) => (
    <div className="flex items-center justify-between" style={{ padding: 'var(--space-3) 0', borderBottom: '1px solid var(--border)' }}>
      <span className="text-sm text-secondary">{label}</span>
      <div className="flex items-center gap-2">
        {ok
          ? <CheckCircle size={15} style={{ color: 'var(--accent-primary)' }} />
          : <XCircle size={15} style={{ color: 'var(--sev-critical)' }} />
        }
        <span className="text-sm font-medium" style={{ color: ok ? 'var(--accent-primary)' : 'var(--sev-critical)' }}>
          {value}
        </span>
      </div>
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <span className="page-header-title">System Status</span>
        <button className="btn btn-ghost btn-sm" onClick={loadHealth} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="page-content">
        <div style={{ marginBottom: 'var(--space-6)' }}>
          <h1 className="page-title">System Status</h1>
          <p className="page-subtitle">Backend connectivity, FalkorDB status, and data seeding controls.</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertTriangle size={16} />
            {error}
          </div>
        )}

        <div className="grid-2" style={{ alignItems: 'start' }}>
          {/* Health status */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Database size={16} style={{ color: 'var(--accent-primary)' }} />
                <span className="section-title">Service Health</span>
              </div>
              {loading ? (
                <span className="spinner" />
              ) : (
                <span className={`badge ${health?.status === 'ok' ? 'badge-green' : 'badge-critical'}`}>
                  {health?.status || 'unknown'}
                </span>
              )}
            </div>
            <div className="card-body">
              {health && (
                <>
                  <StatusRow label="Backend API" value={health.backend} ok={health.backend === 'ok'} />
                  <StatusRow label="FalkorDB" value={health.falkordb} ok={health.falkordb === 'ok'} />
                  <StatusRow
                    label="LLM Mode"
                    value={health.llm_mode}
                    ok={true}
                  />
                </>
              )}

              <div className="alert alert-info mt-4">
                <Zap size={14} style={{ flexShrink: 0 }} />
                <div>
                  <strong>About LLM Mode</strong>
                  <div className="text-xs mt-2">
                    When LLM_PROVIDER is set to <code>deterministic</code>, the full graph investigation
                    still runs — only the AI narrative summary is disabled. Configure an OpenAI or Anthropic
                    key to enable LLM enrichment.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Seed controls */}
          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-2">
                <Play size={16} style={{ color: 'var(--accent-primary)' }} />
                <span className="section-title">Synthetic Data</span>
              </div>
            </div>
            <div className="card-body flex flex-col gap-4">
              <p className="text-sm text-secondary">
                Load synthetic vulnerability, dependency, asset, and team data into FalkorDB.
                The seed operation is idempotent — running it again won't create duplicates.
              </p>

              <div className="flex flex-col gap-3">
                <button
                  className="btn btn-primary"
                  onClick={handleSeed}
                  disabled={seedLoading}
                  id="btn-seed-data"
                >
                  {seedLoading ? <span className="spinner" style={{ width: 14, height: 14 }} /> : <Play size={14} />}
                  Seed Graph Data (idempotent)
                </button>

                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleReseed}
                  disabled={seedLoading}
                  id="btn-reseed-data"
                >
                  Re-seed (clears existing data first)
                </button>
              </div>

              {seedResult && (
                <div className="alert alert-success">
                  <CheckCircle size={14} style={{ flexShrink: 0 }} />
                  <span className="font-mono text-xs">{seedResult}</span>
                </div>
              )}

              <div className="divider" />

              <div className="flex flex-col gap-3">
                <span className="label">Synthetic Dataset Includes</span>
                {[
                  '4 synthetic vulnerabilities (CRITICAL → MEDIUM)',
                  '10 packages with dependency chains',
                  '5 applications across environments',
                  '5 deployed assets with criticality ratings',
                  '4 engineering teams',
                  '4 security findings',
                  '1 incomplete-evidence scenario (VULN-2024-004)',
                  '1 missing-ownership scenario (Report Generator)',
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                    <span className="text-sm text-secondary">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
