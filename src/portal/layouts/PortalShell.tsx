import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FormEvent, useState } from 'react';

import { getZenEmail } from '../auth/session';
import { logout } from '../api/zenleaderApi';

/**
 * Authenticated portal chrome: sidebar nav + main outlet.
 */
export function PortalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const email = getZenEmail();
  const initials = (email || 'U').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className={`zl-app${sidebarOpen ? ' zl-sidebar-open' : ''}`}>
      <button
        type="button"
        className="zl-sidebar-backdrop"
        aria-label="Close menu"
        onClick={closeSidebar}
      />

      <aside className="zl-sidebar" aria-label="Meet portal">
        <div className="zl-sidebar-brand">
          <img src="/assets/imgs/logo-zenleader.png" alt="ZenLeader" />
          <div>
            <p className="zl-sidebar-title">ZenLeader Meet</p>
            <p className="zl-sidebar-sub">Learner portal</p>
          </div>
        </div>

        <nav className="zl-sidebar-nav" onClick={closeSidebar}>
          <NavLink
            to="/my-courses"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
          >
            My courses
          </NavLink>
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
          >
            Events
          </NavLink>
          <NavLink
            to="/join"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
          >
            Join room
          </NavLink>
        </nav>

        <div className="zl-sidebar-footer">
          <div className="zl-user-chip">
            <span className="zl-avatar zl-avatar-fallback">{initials}</span>
            <div className="zl-user-meta">
              <strong>Signed in</strong>
              <span title={email || undefined}>{email || 'Account'}</span>
            </div>
          </div>
          <button
            type="button"
            className="zl-btn zl-btn-ghost zl-btn-block"
            onClick={() => void handleLogout()}
          >
            Sign out
          </button>
        </div>
      </aside>

      <div className="zl-main">
        <header className="zl-topbar">
          <button
            type="button"
            className="zl-menu-btn"
            aria-label="Open menu"
            onClick={() => setSidebarOpen(true)}
          >
            <span />
            <span />
            <span />
          </button>
          <div className="zl-topbar-spacer" />
        </header>
        <Outlet />
      </div>
    </div>
  );
}

/**
 * Compact join-by-code form used on the Join page.
 *
 * @param onJoin - submit handler with room code
 * @param joining - whether a join request is in flight
 * @param error - optional error message
 */
export function JoinRoomForm({
  onJoin,
  joining,
  error,
}: {
  onJoin: (roomCode: string) => void;
  joining: boolean;
  error?: string | null;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCode = String(form.get('roomCode') ?? '').trim();
    onJoin(roomCode);
  };

  return (
    <form className="zl-join-form" onSubmit={handleSubmit}>
      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}
      <div className="zl-field">
        <label htmlFor="roomCode">Room code</label>
        <input
          id="roomCode"
          name="roomCode"
          type="text"
          required
          placeholder="Room code"
          autoComplete="off"
          disabled={joining}
        />
      </div>
      <button
        className="zl-btn zl-btn-accent zl-btn-block"
        type="submit"
        disabled={joining}
      >
        {joining ? 'Joining…' : 'Join meeting'}
      </button>
    </form>
  );
}
