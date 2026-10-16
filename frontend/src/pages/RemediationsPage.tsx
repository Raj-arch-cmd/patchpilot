import { useEffect, useState } from 'react';
import { api, ApiError } from '../services/api';
import type { RemediationBrief } from '../services/api';
import { SeverityBadge } from '../components/Badges';
import { ClipboardCheck, RefreshCw, AlertTriangle } from 'lucide-react';

export function RemediationsPage() {
  const [remediations, setRemediations] = useState<RemediationBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.listRemediations();
      setRemediations(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load remediations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const formatDate = (iso: string) => {
    try { return new Date(iso).toLocaleString(); }
    catch { return iso; }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <ClipboardCheck size={16} style={{ color: 'var(--sev-low)' }} />
          <span className="page-header-title">Remediation History</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load} disabled={loading}>
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      <div className="page-content">
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <h1 className="page-title">Remediation History</h1>
          <p className="page-subtitle">
            All approved simulated remediation actions stored in FalkorDB.
            Each record is linked to a specific investigation and finding.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--space-5)' }}>
            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
            {error}
          </div>
        )}

        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <ClipboardCheck size={16} style={{ color: 'var(--sev-low)' }} />
              <span className="section-title">Approved Remediations</span>
            </div>
            <span className="badge badge-green">{remediations.length}</span>
          </div>

          {loading ? (
            <div className="state-container">
              <div className="spinner spinner-lg" />
            </div>
          ) : remediations.length === 0 ? (
            <div className="state-container">
              <div className="state-icon">📋</div>
              <span className="state-title">No remediations yet</span>
              <span className="state-sub">
                Complete an investigation and approve a remediation action to see records here.
              </span>
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 2fr 1fr 1.2fr 1fr',
                  gap: 'var(--space-3)',
                  padding: 'var(--space-3) var(--space-5)',
                  borderBottom: '1px solid var(--border)',
                  background: 'var(--bg-subtle)',
                }}
              >
                {['Vulnerability', 'Action', 'Status', 'Team', 'Created'].map((h) => (
                  <span key={h} className="label">{h}</span>
                ))}
              </div>

              {remediations.map((rem) => (
                <div
                  key={rem.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1.5fr 2fr 1fr 1.2fr 1fr',
                    gap: 'var(--space-3)',
                    padding: 'var(--space-4) var(--space-5)',
                    borderBottom: '1px solid var(--border)',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    {rem.vuln_title ? (
                      <>
                        <div className="text-sm font-medium truncate">{rem.vuln_title}</div>
                        {rem.vuln_severity && <SeverityBadge severity={rem.vuln_severity} />}
                      </>
                    ) : (
                      <span className="text-xs text-tertiary">{rem.finding_id}</span>
                    )}
                  </div>

                  <div>
                    <div className="text-sm font-medium">{rem.action_type.replace(/_/g, ' ')}</div>
                    <div className="text-xs text-secondary truncate" style={{ maxWidth: 260 }}>
                      {rem.description}
                    </div>
                  </div>

                  <div>
                    <span className="badge badge-green">{rem.status}</span>
                  </div>

                  <div className="text-sm text-secondary">
                    {rem.team_name || <span className="text-tertiary">—</span>}
                  </div>

                  <div className="text-xs text-tertiary">
                    {rem.created_at ? formatDate(rem.created_at) : '—'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
