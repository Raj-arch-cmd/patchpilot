import { NavLink } from 'react-router-dom';
import {
  Shield,
  LayoutDashboard,
  Search,
  Network,
  ClipboardCheck,
  Settings,
  Zap,
} from 'lucide-react';

interface SidebarProps {
  falkorStatus: 'ok' | 'error' | 'loading';
  llmMode: string;
}

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Overview', exact: true },
  { to: '/investigate', icon: Search, label: 'Investigate' },
  { to: '/graph', icon: Network, label: 'Dependency Graph' },
  { to: '/remediations', icon: ClipboardCheck, label: 'Remediations' },
  { to: '/status', icon: Settings, label: 'System Status' },
];

export function Sidebar({ falkorStatus, llmMode }: SidebarProps) {
  return (
    <nav className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">
          <Shield size={18} />
        </div>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-name">PatchPilot</span>
          <span className="sidebar-logo-sub">Security Agent</span>
        </div>
      </div>

      {/* Nav */}
      <div className="sidebar-nav">
        <span className="nav-section-label">Navigation</span>
        {navItems.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Footer status */}
      <div className="sidebar-footer">
        <div className="sidebar-status">
          <span
            className={`status-dot ${
              falkorStatus === 'ok' ? 'ok' : falkorStatus === 'loading' ? 'loading' : 'error'
            }`}
          />
          <span>
            FalkorDB{' '}
            {falkorStatus === 'ok' ? 'connected' : falkorStatus === 'loading' ? 'connecting…' : 'unavailable'}
          </span>
        </div>
        <div className="sidebar-status mt-2">
          <Zap size={11} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
          <span>
            {llmMode === 'deterministic' ? 'Deterministic mode' : `LLM: ${llmMode}`}
          </span>
        </div>
      </div>
    </nav>
  );
}
