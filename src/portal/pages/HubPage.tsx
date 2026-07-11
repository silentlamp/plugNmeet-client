import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import type { EventResponse } from '../api/types';
import {
  fetchMeetingToken,
  fetchMyInterests,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { getZenEmail } from '../auth/session';
import { EventCard } from '../components/EventCard';
import { partitionEvents } from '../utils/eventHelpers';

type HubPageProps = {
  onSignedOut: () => void;
};

const POLL_MS = 20_000;

/**
 * Post-login Dojo-style hub: sidebar shell + Live / Upcoming / Ended event cards.
 *
 * @param onSignedOut - called after local session is cleared
 */
export function HubPage({ onSignedOut }: HubPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const email = getZenEmail();

  const loadEvents = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoadingEvents(true);
      }
      try {
        const list = await fetchMyInterests();
        setEvents(list);
        setError(null);
      } catch (err) {
        if (err instanceof ZenApiError && err.status === 401) {
          await logout();
          onSignedOut();
          return;
        }
        if (!opts?.silent) {
          setEvents([]);
          setError(
            err instanceof Error ? err.message : 'Unable to load events.',
          );
        }
      } finally {
        if (!opts?.silent) {
          setLoadingEvents(false);
        }
      }
    },
    [onSignedOut],
  );

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void loadEvents({ silent: true });
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [loadEvents]);

  const { live, upcoming, ended } = useMemo(
    () => partitionEvents(events),
    [events],
  );

  const joinRoom = async (roomCode: string) => {
    if (!roomCode) {
      setError('This event has no room code yet.');
      return;
    }
    setError(null);
    setJoiningCode(roomCode);
    try {
      const token = await fetchMeetingToken(roomCode);
      redirectToMeeting(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join room');
      setJoiningCode(null);
    }
  };

  const handleJoinSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCode = String(form.get('roomCode') ?? '').trim();
    await joinRoom(roomCode);
  };

  const handleLogout = async () => {
    await logout();
    onSignedOut();
  };

  const initials = (email || 'U').slice(0, 1).toUpperCase();

  return (
    <div className={`zl-app${sidebarOpen ? ' zl-sidebar-open' : ''}`}>
      <button
        type="button"
        className="zl-sidebar-backdrop"
        aria-label="Close menu"
        onClick={() => setSidebarOpen(false)}
      />

      <aside className="zl-sidebar" aria-label="Meet portal">
        <div className="zl-sidebar-brand">
          <img src="./assets/imgs/logo-zenleader.png" alt="ZenLeader" />
          <div>
            <p className="zl-sidebar-title">ZenLeader Meet</p>
            <p className="zl-sidebar-sub">Your live events</p>
          </div>
        </div>

        <nav className="zl-sidebar-nav">
          <a className="zl-nav-item zl-nav-active" href="#live-now">
            Live now
            {live.length > 0 ? (
              <span className="zl-nav-count">{live.length}</span>
            ) : null}
          </a>
          <a className="zl-nav-item" href="#upcoming">
            Upcoming
            {upcoming.length > 0 ? (
              <span className="zl-nav-count">{upcoming.length}</span>
            ) : null}
          </a>
          <a className="zl-nav-item" href="#ended">
            Ended
            {ended.length > 0 ? (
              <span className="zl-nav-count">{ended.length}</span>
            ) : null}
          </a>
        </nav>

        <div className="zl-sidebar-join">
          <p className="zl-sidebar-label">Join with room code</p>
          <form onSubmit={(e) => void handleJoinSubmit(e)}>
            <input
              name="roomCode"
              type="text"
              required
              placeholder="Room code"
              autoComplete="off"
            />
            <button
              className="zl-btn zl-btn-accent zl-btn-block"
              type="submit"
              disabled={joiningCode !== null}
            >
              {joiningCode ? 'Joining…' : 'Join'}
            </button>
          </form>
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
          <div>
            <h1>My events</h1>
            <p>Events you saved — join when they go live</p>
          </div>
          <button
            type="button"
            className="zl-btn zl-btn-ghost zl-btn-sm"
            onClick={() => void loadEvents()}
            disabled={loadingEvents}
          >
            Refresh
          </button>
        </header>

        {error ? (
          <div className="zl-alert" role="alert">
            {error}
          </div>
        ) : null}

        {loadingEvents ? (
          <div className="zl-loading">Loading your events…</div>
        ) : (
          <>
            <section id="live-now" className="zl-section">
              <div className="zl-section-head">
                <div>
                  <h2>Live now</h2>
                  <p>Sessions you can join right now</p>
                </div>
                {live.length > 0 ? (
                  <span className="zl-badge-live">
                    <span className="zl-live-dot" aria-hidden />
                    {live.length} live
                  </span>
                ) : null}
              </div>

              {live.length === 0 ? (
                <div className="zl-empty">
                  No live sessions right now. Check Upcoming below.
                </div>
              ) : (
                <div className="zl-card-grid zl-card-grid-live">
                  {live.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="live"
                      joiningCode={joiningCode}
                      onJoin={(code) => void joinRoom(code)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section id="upcoming" className="zl-section">
              <div className="zl-section-head">
                <div>
                  <h2>Upcoming</h2>
                  <p>Saved events that have not started yet</p>
                </div>
                <span className="zl-count-chip">{upcoming.length}</span>
              </div>

              {upcoming.length === 0 ? (
                <div className="zl-empty">
                  No upcoming saved events. Mark events as interested in the
                  ZenLeader app to see them here.
                </div>
              ) : (
                <div className="zl-card-grid">
                  {upcoming.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="upcoming"
                      joiningCode={joiningCode}
                      onJoin={(code) => void joinRoom(code)}
                    />
                  ))}
                </div>
              )}
            </section>

            <section id="ended" className="zl-section zl-section-muted">
              <details open={ended.length > 0 && ended.length <= 6}>
                <summary className="zl-section-head zl-summary">
                  <div>
                    <h2>Ended</h2>
                    <p>Past events you were interested in</p>
                  </div>
                  <span className="zl-count-chip">{ended.length}</span>
                </summary>

                {ended.length === 0 ? (
                  <div className="zl-empty">No ended events yet.</div>
                ) : (
                  <div className="zl-card-grid zl-card-grid-ended">
                    {ended.map((event) => (
                      <EventCard
                        key={event.id}
                        event={event}
                        variant="ended"
                        joiningCode={joiningCode}
                        onJoin={(code) => void joinRoom(code)}
                      />
                    ))}
                  </div>
                )}
              </details>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
