import { useState } from 'react';
import type { InvestigationResult } from '../services/api';
import { api, ApiError } from '../services/api';
import { CheckCircle, X, AlertTriangle } from 'lucide-react';

interface RemediationModalProps {
  investigation: InvestigationResult;
  onClose: () => void;
  onSuccess: (remId: string) => void;
}

const ACTION_TYPES = [
  { value: 'upgrade_package', label: 'Upgrade vulnerable package' },
  { value: 'apply_patch', label: 'Apply security patch' },
  { value: 'apply_waf_rule', label: 'Apply WAF / network rule' },
  { value: 'isolate_asset', label: 'Isolate affected asset' },
  { value: 'notify_team', label: 'Notify responsible team' },
  { value: 'accept_risk', label: 'Accept risk (documented)' },
];

export function RemediationModal({ investigation, onClose, onSuccess }: RemediationModalProps) {
  const [actionType, setActionType] = useState('upgrade_package');
  const [description, setDescription] = useState('');
  const [teamId, setTeamId] = useState(investigation.responsible_teams[0]?.id || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findingId = investigation.vulnerability.finding_ids[0] || 'finding-001';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError('Please provide a description of the remediation action.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rem = await api.createRemediation({
        finding_id: findingId,
        investigation_id: investigation.investigation_id,
        action_type: actionType,
        description: description.trim(),
        team_id: teamId || undefined,
      });
      onSuccess(rem.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to create remediation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Approve Remediation">
      <div className="modal">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius)',
                background: 'var(--accent-primary-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-primary)',
              }}
            >
              <CheckCircle size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Approve Remediation</h3>
              <p className="text-xs text-secondary">
                This creates a simulated remediation record — no real systems will be changed.
              </p>
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close modal">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {/* Vulnerability context */}
            <div
              style={{
                background: 'var(--bg-subtle)',
                borderRadius: 'var(--radius)',
                padding: 'var(--space-3) var(--space-4)',
                border: '1px solid var(--border)',
              }}
            >
              <div className="label mb-2">For Vulnerability</div>
              <div className="font-semibold text-sm">{investigation.vulnerability.title}</div>
              <div className="text-xs text-secondary">{investigation.vuln_id}</div>
            </div>

            {/* Action type */}
            <div className="form-group">
              <label htmlFor="action-type" className="form-label">Action Type</label>
              <select
                id="action-type"
                className="form-select"
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                {ACTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div className="form-group">
              <label htmlFor="rem-description" className="form-label">
                Remediation Description <span style={{ color: 'var(--sev-critical)' }}>*</span>
              </label>
              <textarea
                id="rem-description"
                className="form-textarea"
                placeholder="Describe the specific remediation action to take (e.g., 'Upgrade xml-parser to version 2.4.2 or later')"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                required
              />
            </div>

            {/* Team */}
            {investigation.responsible_teams.length > 0 && (
              <div className="form-group">
                <label htmlFor="rem-team" className="form-label">Assign to Team</label>
                <select
                  id="rem-team"
                  className="form-select"
                  value={teamId}
                  onChange={(e) => setTeamId(e.target.value)}
                >
                  <option value="">No team assigned</option>
                  {investigation.responsible_teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Warning */}
            <div className="alert alert-warning">
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>
                This is a <strong>simulated</strong> remediation. It will be recorded in FalkorDB
                but will not trigger any real patching, deployments, or infrastructure changes.
              </span>
            </div>

            {error && (
              <div className="alert alert-error">
                <AlertTriangle size={14} style={{ flexShrink: 0 }} />
                {error}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading || !description.trim()}>
              {loading ? (
                <>
                  <span className="spinner" style={{ width: 14, height: 14 }} />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle size={14} />
                  Approve &amp; Record
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
