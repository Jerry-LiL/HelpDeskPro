import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth';
import type { SlaWindow } from '../types';

export function Layout({ policy }: { policy: SlaWindow[] }) {
  const { user, logout } = useAuth();

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">HD</span>
          <div>
            <strong>HelpDeskPro</strong>
            <div className="brand-sub">Agent console</div>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Tickets
          </NavLink>
          {user?.role === 'admin' && <NavLink to="/users">People</NavLink>}
        </nav>
        <div className="sidebar-foot">
          <div className="who">
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <button type="button" className="ghost" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <div className="main">
        <Outlet />
        {policy.length > 0 && (
          <p className="policy">
            SLA windows:{' '}
            {policy
              .map((window) => `${window.priority} ${formatWindow(window.minutes)}`)
              .join(' · ')}
          </p>
        )}
      </div>
    </div>
  );
}

function formatWindow(minutes: number): string {
  if (minutes % (60 * 24) === 0) {
    return `${minutes / (60 * 24)}d`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60}h`;
  }
  return `${minutes}m`;
}
