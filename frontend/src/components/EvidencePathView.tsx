import { Fragment } from 'react';
import type { EvidencePath } from '../services/api';
import { ChevronRight } from 'lucide-react';

interface EvidencePathViewProps {
  paths: EvidencePath[];
  maxDisplay?: number;
}

const NODE_ICONS: Record<string, string> = {
  Vulnerability: '⚠',
  Package: '📦',
  Application: '🖥',
  Asset: '🖧',
  Team: '👥',
};

export function EvidencePathView({ paths, maxDisplay = 5 }: EvidencePathViewProps) {
  if (!paths || paths.length === 0) {
    return (
      <p className="text-sm text-secondary" style={{ fontStyle: 'italic' }}>
        No dependency paths were found for this vulnerability.
      </p>
    );
  }

  const displayed = paths.slice(0, maxDisplay);

  return (
    <div className="flex flex-col gap-3">
      {displayed.map((path, i) => (
        <div key={i} className="flex flex-col gap-2">
          <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
            <span className="label">Path {i + 1}</span>
            <span className="text-xs text-tertiary">→ {path.app_name}</span>
            <span className="badge badge-uncertain text-xs">{path.hops} hops</span>
          </div>
          <div className="evidence-path" role="list" aria-label={`Dependency path to ${path.app_name}`}>
            {path.path_nodes.map((node, ni) => (
              <Fragment key={ni}>
                {ni > 0 && (
                  <span className="path-arrow" aria-hidden="true">
                    <ChevronRight size={12} />
                  </span>
                )}
                <span
                  className={`path-node type-${node.label}`}
                  role="listitem"
                  title={`${node.label}: ${node.name}${node.version ? ' v' + node.version : ''}`}
                >
                  <span aria-hidden="true">{NODE_ICONS[node.label] || '●'}</span>
                  {node.name}
                  {node.version && (
                    <span style={{ opacity: 0.7 }}>@{node.version}</span>
                  )}
                </span>
              </Fragment>
            ))}
          </div>
        </div>
      ))}
      {paths.length > maxDisplay && (
        <p className="text-xs text-tertiary">
          + {paths.length - maxDisplay} more paths not shown.
        </p>
      )}
    </div>
  );
}
