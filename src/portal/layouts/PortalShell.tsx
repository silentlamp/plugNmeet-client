import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';

import { getZenEmail } from '../auth/session';
import {
  fetchMeetingToken,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';

/**
 * Authenticated portal chrome: sidebar nav + main outlet.
 */
export function PortalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();
  const email = getZenEmail();
  const initials = (email || 'U').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  /**
   * Opens the join-by-code dialog and closes the mobile drawer if needed.
   */
  const openJoinDialog = () => {
    setJoinError(null);
    setSidebarOpen(false);
    setJoinOpen(true);
  };

  /**
   * Closes the join dialog and clears in-flight join UI state.
   */
  const closeJoinDialog = () => {
    if (joining) {
      return;
    }
    setJoinOpen(false);
    setJoinError(null);
  };

  /**
   * Requests a meeting token for the room code and redirects to Meet.
   *
   * @param roomCode - PlugNMeet room code from the dialog form
   */
  const handleJoin = async (roomCode: string) => {
    setJoinError(null);
    setJoining(true);
    try {
      const token = await fetchMeetingToken(roomCode);
      redirectToMeeting(token);
    } catch (err) {
      if (err instanceof ZenApiError && err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setJoinError(err instanceof Error ? err.message : 'Unable to join room');
      setJoining(false);
    }
  };

  useEffect(() => {
    if (!joinOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !joining) {
        setJoinOpen(false);
        setJoinError(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [joinOpen, joining]);

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

        <nav className="zl-sidebar-nav">
          <NavLink
            to="/my-courses"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
            onClick={closeSidebar}
          >
            My courses
          </NavLink>
          <NavLink
            to="/events"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
            onClick={closeSidebar}
          >
            Saved events
          </NavLink>
          <NavLink
            to="/my-events"
            className={({ isActive }) =>
              `zl-nav-item${isActive ? ' zl-nav-active' : ''}`
            }
            onClick={closeSidebar}
          >
            My events
          </NavLink>
          <button
            type="button"
            className="zl-nav-item zl-nav-btn"
            onClick={openJoinDialog}
          >
            Join room
          </button>
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

      {joinOpen ? (
        <div className="zl-dialog-backdrop" role="presentation">
          <button
            type="button"
            className="zl-dialog-scrim"
            aria-label="Close join dialog"
            onClick={closeJoinDialog}
          />
          <div
            className="zl-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zl-join-dialog-title"
          >
            <div className="zl-dialog-head">
              <div>
                <h2 id="zl-join-dialog-title">Join room</h2>
                <p>Enter a room code to join a live meeting</p>
              </div>
              <button
                type="button"
                className="zl-dialog-close"
                aria-label="Close"
                onClick={closeJoinDialog}
                disabled={joining}
              >
                ×
              </button>
            </div>
            <JoinRoomForm
              onJoin={(code) => void handleJoin(code)}
              joining={joining}
              error={joinError}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact join-by-code form used in the sidebar Join room dialog.
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
          autoFocus
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
