import type { PriorityInfo } from '../services/api';

interface PriorityScoreCardProps {
  priority: PriorityInfo;
  factorsDetail?: Record<string, unknown>;
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'var(--sev-critical)',
  HIGH: 'var(--sev-high)',
  MEDIUM: 'var(--sev-medium)',
  LOW: 'var(--sev-low)',
  UNCERTAIN: 'var(--text-tertiary)',
};

function ScoreFactor({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (Math.abs(value) / max) * 100)) : 0;
  const negative = value < 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </span>
        <span
          className="text-sm font-semibold"
          style={{ color: negative ? 'var(--sev-critical)' : color }}
        >
          {negative ? '' : '+'}{value}
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            background: negative ? 'var(--sev-critical)' : color,
          }}
        />
      </div>
    </div>
  );
}

export function PriorityScoreCard({ priority, factorsDetail }: PriorityScoreCardProps) {
  const color = PRIORITY_COLORS[priority.label] || 'var(--text-secondary)';
  const totalPct = Math.min(100, (priority.score / 100) * 100);

  return (
    <div className="flex flex-col gap-5">
      {/* Total score */}
      <div className="flex items-center gap-5">
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <svg width="88" height="88" viewBox="0 0 88 88">
            <circle
              cx="44" cy="44" r="36"
              fill="none"
              stroke="var(--bg-muted)"
              strokeWidth="8"
            />
            <circle
              cx="44" cy="44" r="36"
              fill="none"
              stroke={color}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - totalPct / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 44 44)"
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
            <text
              x="44" y="44"
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="18"
              fontWeight="700"
              fill={color}
              fontFamily="var(--font-sans)"
            >
              {priority.score}
            </text>
          </svg>
        </div>
        <div className="flex flex-col gap-1">
          <span
            className="badge"
            style={{
              background: color + '15',
              color,
              borderColor: color + '40',
              fontSize: '13px',
              padding: '4px 12px',
            }}
          >
            {priority.label}
          </span>
          <span className="text-sm text-secondary">{priority.score}/100</span>
          <span className="text-xs text-tertiary">
            {priority.affected_application_count} app{priority.affected_application_count !== 1 ? 's' : ''},{' '}
            {priority.affected_asset_count} asset{priority.affected_asset_count !== 1 ? 's' : ''}
          </span>
          <span className="text-xs text-tertiary">
            Highest asset: {priority.top_asset_criticality}
          </span>
        </div>
      </div>

      {/* Factor breakdown */}
      <div className="flex flex-col gap-3">
        <span className="label">Score Breakdown</span>
        <ScoreFactor
          label="Severity"
          value={priority.severity_contribution}
          max={40}
          color="var(--sev-critical)"
        />
        <ScoreFactor
          label="Asset Criticality"
          value={priority.asset_criticality_contribution}
          max={30}
          color="var(--sev-high)"
        />
        <ScoreFactor
          label="Dependency Reach"
          value={priority.reach_contribution}
          max={20}
          color="var(--accent-amber)"
        />
        <ScoreFactor
          label="Exposure Bonus"
          value={priority.exposure_contribution}
          max={10}
          color="var(--accent-primary)"
        />
        {priority.confidence_penalty !== 0 && (
          <ScoreFactor
            label="Evidence Penalty"
            value={priority.confidence_penalty}
            max={15}
            color="var(--sev-critical)"
          />
        )}
      </div>

      {factorsDetail && (
        <div
          className="text-xs text-tertiary"
          style={{
            background: 'var(--bg-subtle)',
            borderRadius: 'var(--radius)',
            padding: 'var(--space-3)',
            fontFamily: 'var(--font-mono)',
            lineHeight: 1.8,
          }}
        >
          Formula: {String(factorsDetail.formula)}
        </div>
      )}
    </div>
  );
}
