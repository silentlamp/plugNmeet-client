import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

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
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Saved events
          </h1>
          <p className="text-muted-foreground text-sm">
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
          <RefreshCw
            className={loadingEvents ? 'size-4 animate-spin' : 'size-4'}
          />
          Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loadingEvents ? (
        <div
          className="flex flex-col gap-3"
          aria-busy="true"
          aria-label="Loading your events"
        >
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : (
        <>
          <section id="live-now" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Live now</h2>
                <p className="text-muted-foreground text-sm">
                  Sessions you can join right now
                </p>
              </div>
              {live.length > 0 ? (
                <Badge variant="default" className="gap-1.5">
                  <span
                    className="size-1.5 animate-pulse rounded-full bg-current"
                    aria-hidden
                  />
                  {live.length} live
                </Badge>
              ) : null}
            </div>
            {live.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                No live sessions right now. Check Upcoming below.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
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

          <section id="upcoming" className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-1">
                <h2 className="text-lg font-semibold">Upcoming</h2>
                <p className="text-muted-foreground text-sm">
                  Saved events that have not started yet
                </p>
              </div>
              <Badge variant="secondary">{upcoming.length}</Badge>
            </div>
            {upcoming.length === 0 ? (
              <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                No upcoming saved events. Mark events as interested in the
                ZenLeader app to see them here.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
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

          <section id="ended" className="space-y-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none flex-wrap items-end justify-between gap-2 [&::-webkit-details-marker]:hidden">
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold">Ended</h2>
                  <p className="text-muted-foreground text-sm">
                    Past events you were interested in
                  </p>
                </div>
                <Badge variant="outline">{ended.length}</Badge>
              </summary>
              <div className="mt-3">
                {ended.length === 0 ? (
                  <p className="text-muted-foreground rounded-xl border border-dashed px-4 py-8 text-center text-sm">
                    No ended events yet.
                  </p>
                ) : (
                  <div className="flex flex-col gap-3">
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
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
