import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FormEvent, useEffect, useState } from 'react';

import { getZenEmail } from '../auth/session';
import {
  createInstantMeeting,
  fetchMeetingToken,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';

type MeetDialogMode = 'join' | 'create';

/**
 * Authenticated portal chrome: sidebar nav + main outlet.
 *
 * Meet (join / instant meeting) is a global action — one primary entry in the
 * sidebar, plus a compact topbar control on small screens when the drawer is closed.
 */
export function PortalShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetMode, setMeetMode] = useState<MeetDialogMode>('join');
  const [meetError, setMeetError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const email = getZenEmail();
  const initials = (email || 'U').slice(0, 1).toUpperCase();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);

  /**
   * Opens the meet dialog (join / create) and closes the mobile drawer if needed.
   */
  const openMeetDialog = (mode: MeetDialogMode = 'join') => {
    setMeetError(null);
    setCreatedRoomCode(null);
    setMeetMode(mode);
    setSidebarOpen(false);
    setMeetOpen(true);
  };

  /**
   * Closes the meet dialog and clears in-flight UI state.
   */
  const closeMeetDialog = () => {
    if (busy) {
      return;
    }
    setMeetOpen(false);
    setMeetError(null);
    setCreatedRoomCode(null);
  };

  /**
   * Handles 401 by signing out; otherwise surfaces the error message.
   */
  const handleAuthAwareError = async (err: unknown, fallback: string) => {
    if (err instanceof ZenApiError && err.status === 401) {
      await logout();
      navigate('/login', { replace: true });
      return;
    }
    setMeetError(err instanceof Error ? err.message : fallback);
    setBusy(false);
  };

  /**
   * Requests a meeting token for the room code and redirects to Meet.
   *
   * @param roomCode - PlugNMeet room code from the dialog form
   */
  const handleJoin = async (roomCode: string) => {
    setMeetError(null);
    setBusy(true);
    try {
      const token = await fetchMeetingToken(roomCode);
      redirectToMeeting(token);
    } catch (err) {
      await handleAuthAwareError(err, 'Unable to join room');
    }
  };

  /**
   * Creates an instant unlinked meeting for the signed-in host and redirects as host.
   *
   * @param title - optional meeting title
   */
  const handleCreateInstant = async (title: string) => {
    setMeetError(null);
    setCreatedRoomCode(null);
    setBusy(true);
    try {
      const result = await createInstantMeeting({
        title: title.trim() || undefined,
      });
      if (result.roomCode) {
        setCreatedRoomCode(result.roomCode);
      }
      redirectToMeeting(result.token);
    } catch (err) {
      await handleAuthAwareError(err, 'Unable to create meeting');
    }
  };

  useEffect(() => {
    if (!meetOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) {
        setMeetOpen(false);
        setMeetError(null);
        setCreatedRoomCode(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [meetOpen, busy]);

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

        <nav className="zl-sidebar-nav" aria-label="Portal pages">
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
        </nav>

        <div className="zl-sidebar-action">
          <p className="zl-sidebar-label">Quick action</p>
          <button
            type="button"
            className="zl-btn zl-btn-accent zl-btn-block zl-meet-cta"
            onClick={() => openMeetDialog('join')}
          >
            Meet
            <span className="zl-meet-cta-hint">Join or start</span>
          </button>
        </div>

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
        <header className="zl-topbar zl-topbar-mobile">
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
          <div className="zl-topbar-brand">
            <strong>ZenLeader</strong>
            <span>Portal</span>
          </div>
          <button
            type="button"
            className="zl-btn zl-btn-accent zl-btn-sm"
            onClick={() => openMeetDialog('join')}
          >
            Meet
          </button>
        </header>
        <Outlet />
      </div>

      {meetOpen ? (
        <div className="zl-dialog-backdrop" role="presentation">
          <button
            type="button"
            className="zl-dialog-scrim"
            aria-label="Close meet dialog"
            onClick={closeMeetDialog}
          />
          <div
            className="zl-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="zl-meet-dialog-title"
          >
            <div className="zl-dialog-head">
              <div>
                <h2 id="zl-meet-dialog-title">Meet</h2>
                <p>Join with a room code or start a new meeting</p>
              </div>
              <button
                type="button"
                className="zl-dialog-close"
                aria-label="Close"
                onClick={closeMeetDialog}
                disabled={busy}
              >
                ×
              </button>
            </div>

            <div className="zl-mode-tabs" role="tablist" aria-label="Meet mode">
              <button
                type="button"
                role="tab"
                aria-selected={meetMode === 'join'}
                className={`zl-mode-tab${meetMode === 'join' ? ' zl-mode-tab-active' : ''}`}
                disabled={busy}
                onClick={() => {
                  setMeetMode('join');
                  setMeetError(null);
                  setCreatedRoomCode(null);
                }}
              >
                Join with code
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={meetMode === 'create'}
                className={`zl-mode-tab${meetMode === 'create' ? ' zl-mode-tab-active' : ''}`}
                disabled={busy}
                onClick={() => {
                  setMeetMode('create');
                  setMeetError(null);
                  setCreatedRoomCode(null);
                }}
              >
                New meeting
              </button>
            </div>

            {meetMode === 'join' ? (
              <JoinRoomForm
                onJoin={(code) => void handleJoin(code)}
                joining={busy}
                error={meetError}
              />
            ) : (
              <CreateMeetingForm
                onCreate={(title) => void handleCreateInstant(title)}
                creating={busy}
                error={meetError}
                createdRoomCode={createdRoomCode}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/**
 * Compact join-by-code form used in the Meet dialog.
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
      <p className="zl-form-hint">
        Enter the room code from an event or course session (for example{' '}
        <code>abc-defg-hijk</code>).
      </p>
      <div className="zl-field">
        <label htmlFor="roomCode">Room code</label>
        <input
          id="roomCode"
          name="roomCode"
          type="text"
          required
          placeholder="xxx-xxxx-xxx"
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

/**
 * Instant meeting form — creates a host-owned room (no event link) like Google Meet.
 *
 * @param onCreate - submit handler with optional title
 * @param creating - whether create is in flight
 * @param error - optional error message
 * @param createdRoomCode - room code shown briefly before redirect
 */
export function CreateMeetingForm({
  onCreate,
  creating,
  error,
  createdRoomCode,
}: {
  onCreate: (title: string) => void;
  creating: boolean;
  error?: string | null;
  createdRoomCode?: string | null;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    onCreate(title);
  };

  return (
    <form className="zl-join-form" onSubmit={handleSubmit}>
      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}
      {createdRoomCode ? (
        <div className="zl-alert zl-alert-success" role="status">
          Room code: <strong>{createdRoomCode}</strong> — opening meet…
        </div>
      ) : null}
      <p className="zl-form-hint">
        Start a meeting that is not linked to an event. You become the host;
        guests who join with your room code wait in the waiting room until you
        approve them.
      </p>
      <div className="zl-field">
        <label htmlFor="meetingTitle">Meeting title (optional)</label>
        <input
          id="meetingTitle"
          name="title"
          type="text"
          placeholder="Quick sync"
          autoComplete="off"
          autoFocus
          disabled={creating}
        />
      </div>
      <button
        className="zl-btn zl-btn-accent zl-btn-block"
        type="submit"
        disabled={creating}
      >
        {creating ? 'Starting…' : 'Start meeting'}
      </button>
    </form>
  );
}
