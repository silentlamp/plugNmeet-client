import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
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
import { PortalLoading } from '../components/PortalLoading';
import { partitionEvents } from '../utils/eventHelpers';
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Badge } from '@/portal/components/ui/badge';
import { Button } from '@/portal/components/ui/button';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Saved events
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Events you saved — join when they go live
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void loadEvents()}
          disabled={loadingEvents}
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loadingEvents ? (
        <PortalLoading message="Loading your events…" />
      ) : (
        <>
          <EventSection
            id="live-now"
            title="Live now"
            subtitle="Sessions you can join right now"
            badge={
              live.length > 0 ? (
                <Badge className="gap-1.5 bg-destructive text-white hover:bg-destructive">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" />
                  {live.length} live
                </Badge>
              ) : null
            }
            empty="No live sessions right now. Check Upcoming below."
          >
            {live.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                variant="live"
                joiningCode={joiningCode}
                onJoin={(code) => void joinRoom(code)}
              />
            ))}
          </EventSection>

          <EventSection
            id="upcoming"
            title="Upcoming"
            subtitle="Saved events that have not started yet"
            count={upcoming.length}
            empty="No upcoming saved events. Mark events as interested in the ZenLeader app to see them here."
          >
            {upcoming.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                variant="upcoming"
                joiningCode={joiningCode}
                onJoin={(code) => void joinRoom(code)}
              />
            ))}
          </EventSection>

          <section id="ended" className="space-y-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">Ended</h2>
                  <p className="text-sm text-muted-foreground">
                    Past events you were interested in
                  </p>
                </div>
                <Badge variant="secondary">{ended.length}</Badge>
              </summary>
              <div className="mt-3 space-y-3">
                {ended.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No ended events yet.
                  </p>
                ) : (
                  ended.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      variant="ended"
                      joiningCode={joiningCode}
                      onJoin={(code) => void joinRoom(code)}
                    />
                  ))
                )}
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}

/**
 * Shared section chrome for Saved events lists.
 */
function EventSection({
  id,
  title,
  subtitle,
  count,
  badge,
  empty,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  count?: number;
  badge?: ReactNode;
  empty: ReactNode;
  children: ReactNode;
}) {
  const items = Array.isArray(children) ? children : [children];
  const hasItems = items.filter(Boolean).length > 0;

  return (
    <section id={id} className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {badge}
        {count != null && !badge ? (
          <Badge variant="secondary">{count}</Badge>
        ) : null}
      </div>
      {!hasItems ? (
        <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
          {empty}
        </p>
      ) : (
        <div className="space-y-3">{children}</div>
      )}
    </section>
  );
}
