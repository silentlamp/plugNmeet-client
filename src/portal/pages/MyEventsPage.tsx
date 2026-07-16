import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

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
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Badge } from '@/portal/components/ui/badge';
import { Button } from '@/portal/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Hosting
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">My events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, publish, and host sessions with a shareable room code.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" asChild>
            <Link to="/my-events/create">Create event</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadEvents()}
            disabled={loadingEvents}
            aria-label="Refresh events"
          >
            Refresh
          </Button>
        </div>
      </div>

      {notice ? (
        <Alert className="relative pr-10">
          <AlertDescription>{notice}</AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute top-2 right-2"
            aria-label="Dismiss"
            onClick={() => setNotice(null)}
          >
            <X />
          </Button>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loadingEvents ? (
        <PortalLoading message="Loading your events…" />
      ) : isEmptyHub ? (
        <Card className="items-center py-10 text-center">
          <CardHeader className="items-center">
            <img
              src="/assets/imgs/logo-zenleader.png"
              alt=""
              className="mb-2 size-14 object-contain opacity-80"
            />
            <CardTitle>Host your first event</CardTitle>
            <CardDescription className="max-w-md">
              Publish a session, share the room code, and join from Meet when it
              goes live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/my-events/create">Create event</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div
            className="grid grid-cols-2 gap-3 sm:grid-cols-4"
            aria-label="Event summary"
          >
            {[
              { label: 'Live', value: live.length },
              { label: 'Upcoming', value: upcoming.length },
              { label: 'Drafts', value: drafts.length },
              { label: 'Ended', value: ended.length },
            ].map((stat) => (
              <Card key={stat.label} className="gap-1 py-4 shadow-none">
                <CardContent className="px-4">
                  <p className="text-2xl font-semibold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <EventSection
            id="my-live-now"
            title="Live now"
            subtitle="Sessions you can join immediately"
            badge={
              live.length > 0 ? (
                <Badge className="gap-1.5 bg-destructive text-white hover:bg-destructive">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" />
                  {live.length} live
                </Badge>
              ) : null
            }
            empty="Nothing live right now."
          >
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
          </EventSection>

          <EventSection
            id="my-upcoming"
            title="Upcoming"
            subtitle="Published events waiting to start"
            count={upcoming.length}
            empty={
              <>
                No upcoming published events.{' '}
                <Link
                  className="font-medium text-primary underline-offset-4 hover:underline"
                  to="/my-events/create"
                >
                  Create one
                </Link>
              </>
            }
          >
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
          </EventSection>

          <EventSection
            id="my-drafts"
            title="Drafts"
            subtitle="Not published yet"
            count={drafts.length}
            empty="No drafts."
          >
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
          </EventSection>

          <section id="my-ended" className="space-y-3">
            <details className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">Ended</h2>
                  <p className="text-sm text-muted-foreground">
                    Past events you hosted
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
                      compactMeta
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
 * Shared section chrome for My events / Saved events lists.
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
