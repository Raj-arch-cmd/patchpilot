
interface SeverityBadgeProps {
  severity: string;
  className?: string;
}

const SEVERITY_CLASS: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
  INFORMATIONAL: 'badge-uncertain',
};

export function SeverityBadge({ severity, className = '' }: SeverityBadgeProps) {
  const cls = SEVERITY_CLASS[severity?.toUpperCase()] || 'badge-uncertain';
  return (
    <span className={`badge ${cls} ${className}`} aria-label={`Severity: ${severity}`}>
      {severity}
    </span>
  );
}

interface PriorityBadgeProps {
  label: string;
  score?: number;
}

const PRIORITY_CLASS: Record<string, string> = {
  CRITICAL: 'badge-critical',
  HIGH: 'badge-high',
  MEDIUM: 'badge-medium',
  LOW: 'badge-low',
  UNCERTAIN: 'badge-uncertain',
};

export function PriorityBadge({ label, score }: PriorityBadgeProps) {
  const cls = PRIORITY_CLASS[label?.toUpperCase()] || 'badge-uncertain';
  return (
    <span className={`badge ${cls}`}>
      {label}
      {score !== undefined && ` · ${score}/100`}
    </span>
  );
}

interface CriticalityBadgeProps {
  criticality: string;
}

export function CriticalityBadge({ criticality }: CriticalityBadgeProps) {
  const cls = SEVERITY_CLASS[criticality?.toUpperCase()] || 'badge-uncertain';
  return <span className={`badge ${cls}`}>{criticality}</span>;
}
