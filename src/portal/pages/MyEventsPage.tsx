import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import type { EventResponse } from '../api/types';
import {
  fetchMeetingToken,
  fetchMyCreated,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { EventCard } from '../components/EventCard';
import { PortalLoading } from '../components/PortalLoading';
import { partitionEvents } from '../utils/eventHelpers';

const POLL_MS = 20_000;

/**
 * Returns true when the event is still a draft (not published).
 *
 * @param event - event from my-created
 */
function isDraftEvent(event: EventResponse): boolean {
  return String(event.status || '').toUpperCase() === 'DRAFT';
}

/**
 * My Events hub: events the signed-in user created (drafts + published).
 */
export function MyEventsPage() {
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const state = location.state as { createdRoomCode?: string | null } | null;
    if (state?.createdRoomCode) {
      setNotice(
        `Event created. Room code: ${state.createdRoomCode} — share it so guests can join from Meet.`,
      );
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location, navigate]);

  const loadEvents = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoadingEvents(true);
      }
      try {
        const list = await fetchMyCreated();
        setEvents(list);
        setError(null);
      } catch (err) {
        if (err instanceof ZenApiError && err.status === 401) {
          await logout();
          navigate('/login', { replace: true });
          return;
        }
        if (!opts?.silent) {
          setEvents([]);
          setError(
            err instanceof Error ? err.message : 'Unable to load your events.',
          );
        }
      } finally {
        if (!opts?.silent) {
          setLoadingEvents(false);
        }
      }
    },
    [navigate],
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

  const { drafts, live, upcoming, ended } = useMemo(() => {
    const draftList = events
      .filter(isDraftEvent)
      .sort(
        (a, b) =>
          Date.parse(b.startTime || '') - Date.parse(a.startTime || '') ||
          String(b.id).localeCompare(String(a.id)),
      );
    const published = events.filter((event) => !isDraftEvent(event));
    const buckets = partitionEvents(published);
    return { drafts: draftList, ...buckets };
  }, [events]);

  const isEmptyHub =
    !loadingEvents &&
    live.length === 0 &&
    upcoming.length === 0 &&
    drafts.length === 0 &&
    ended.length === 0;

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

  return (
    <>
      <div className="zl-page-head">
        <div>
          <p className="zl-page-eyebrow">Hosting</p>
          <h1>My events</h1>
          <p>Create, publish, and host sessions with a shareable room code.</p>
        </div>
        <div className="zl-page-head-actions">
          <Link
            className="zl-btn zl-btn-accent zl-btn-sm"
            to="/my-events/create"
          >
            Create event
          </Link>
          <button
            type="button"
            className="zl-btn zl-btn-ghost zl-btn-sm"
            onClick={() => void loadEvents()}
            disabled={loadingEvents}
            aria-label="Refresh events"
          >
            Refresh
          </button>
        </div>
      </div>

      {notice ? (
        <div className="zl-alert zl-alert-success" role="status">
          {notice}
          <button
            type="button"
            className="zl-alert-dismiss"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
          >
            ×
          </button>
        </div>
      ) : null}

      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loadingEvents ? (
        <PortalLoading message="Loading your events…" />
      ) : isEmptyHub ? (
        <section className="zl-empty-hero" aria-label="No events yet">
          <div className="zl-empty-hero-mark" aria-hidden>
            <img src="/assets/imgs/logo-zenleader.png" alt="" />
          </div>
          <h2>Host your first event</h2>
          <p>
            Publish a session, share the room code, and join from Meet when it
            goes live.
          </p>
          <Link className="zl-btn zl-btn-accent" to="/my-events/create">
            Create event
          </Link>
        </section>
      ) : (
        <>
          <div className="zl-stat-strip" aria-label="Event summary">
            <div className="zl-stat">
              <strong>{live.length}</strong>
              <span>Live</span>
            </div>
            <div className="zl-stat">
              <strong>{upcoming.length}</strong>
              <span>Upcoming</span>
            </div>
            <div className="zl-stat">
              <strong>{drafts.length}</strong>
              <span>Drafts</span>
            </div>
            <div className="zl-stat">
              <strong>{ended.length}</strong>
              <span>Ended</span>
            </div>
          </div>

          <section id="my-live-now" className="zl-section">
            <div className="zl-section-head">
              <div>
                <h2>Live now</h2>
                <p>Sessions you can join immediately</p>
              </div>
              {live.length > 0 ? (
                <span className="zl-badge-live">
                  <span className="zl-live-dot" aria-hidden />
                  {live.length} live
                </span>
              ) : null}
            </div>
            {live.length === 0 ? (
              <div className="zl-empty zl-empty-compact">
                Nothing live right now.
              </div>
            ) : (
              <div className="zl-list">
                {live.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="live"
                    compactMeta
                    joiningCode={joiningCode}
                    onJoin={(code) => void joinRoom(code)}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="my-upcoming" className="zl-section">
            <div className="zl-section-head">
              <div>
                <h2>Upcoming</h2>
                <p>Published events waiting to start</p>
              </div>
              <span className="zl-count-chip">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="zl-empty zl-empty-compact">
                No upcoming published events.{' '}
                <Link to="/my-events/create">Create one</Link>
              </div>
            ) : (
              <div className="zl-list">
                {upcoming.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="upcoming"
                    compactMeta
                    joiningCode={joiningCode}
                    onJoin={(code) => void joinRoom(code)}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="my-drafts" className="zl-section">
            <div className="zl-section-head">
              <div>
                <h2>Drafts</h2>
                <p>Not published yet</p>
              </div>
              <span className="zl-count-chip">{drafts.length}</span>
            </div>
            {drafts.length === 0 ? (
              <div className="zl-empty zl-empty-compact">No drafts.</div>
            ) : (
              <div className="zl-list">
                {drafts.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    variant="draft"
                    compactMeta
                    joiningCode={joiningCode}
                    onJoin={(code) => void joinRoom(code)}
                  />
                ))}
              </div>
            )}
          </section>

          <section id="my-ended" className="zl-section zl-section-muted">
            <details>
              <summary className="zl-section-head zl-summary">
                <div>
                  <h2>Ended</h2>
                  <p>Past events you hosted</p>
                </div>
                <span className="zl-count-chip">{ended.length}</span>
              </summary>
              {ended.length === 0 ? (
                <div className="zl-empty zl-empty-compact">
                  No ended events yet.
                </div>
              ) : (
                <div className="zl-list zl-list-ended">
                  {ended.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="ended"
                      compactMeta
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
    </>
  );
}
