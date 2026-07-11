import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { EventResponse } from '../api/types';
import {
  fetchMeetingToken,
  fetchMyInterests,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { EventCard } from '../components/EventCard';
import { partitionEvents } from '../utils/eventHelpers';

const POLL_MS = 20_000;

/**
 * Events hub: interested events partitioned into Live / Upcoming / Ended.
 */
export function EventsPage() {
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<EventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [joiningCode, setJoiningCode] = useState<string | null>(null);
  const navigate = useNavigate();

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
          navigate('/login', { replace: true });
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

  return (
    <>
      <div className="zl-page-head">
        <div>
          <h1>Events</h1>
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
      </div>

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
              <div className="zl-list">
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
              <div className="zl-list">
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
            <details>
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
                <div className="zl-list zl-list-ended">
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
    </>
  );
}
