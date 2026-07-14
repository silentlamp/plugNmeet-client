import type { EventResponse } from '../api/types';
import { formatApiUtcLocal, parseApiUtcMs } from './timeUtils';

export type EventBucket = 'live' | 'upcoming' | 'ended';

type EventFlags = EventResponse & {
  ongoing?: boolean;
  is_ongoing?: boolean;
};

/**
 * Extracts a room code from event fields or `liveLink` query params.
 *
 * @param event - interested event payload
 */
export function extractRoomCode(event: EventResponse): string {
  if (event.roomCode) {
    return String(event.roomCode).trim();
  }
  const link = event.liveLink || '';
  try {
    const url = new URL(link, window.location.origin);
    const fromQuery =
      url.searchParams.get('roomId') ||
      url.searchParams.get('roomCode') ||
      url.searchParams.get('room_id');
    if (fromQuery) {
      return fromQuery.trim();
    }
  } catch {
    // ignore invalid URLs
  }
  const match = String(link).match(/[?&]roomId=([^&]+)/i);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Formats an ISO timestamp for hub cards in the user's local timezone.
 *
 * @param iso - event time (UTC from API)
 */
export function formatEventTime(iso?: string): string {
  return formatApiUtcLocal(iso, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Compact start label for list rows (user local timezone).
 *
 * @param iso - start time (UTC from API)
 */
export function formatStartLabel(iso?: string): string {
  return formatApiUtcLocal(iso, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Resolves whether an event is currently live.
 * Prefers API `isOngoing` / `ongoing`, else derives from UTC start/end.
 *
 * @param event - event payload
 */
export function resolveIsOngoing(event: EventResponse): boolean {
  const flags = event as EventFlags;
  if (typeof flags.isOngoing === 'boolean') {
    return flags.isOngoing;
  }
  if (typeof flags.ongoing === 'boolean') {
    return flags.ongoing;
  }
  if (typeof flags.is_ongoing === 'boolean') {
    return flags.is_ongoing;
  }
  if (!event.startTime || !event.endTime) {
    return false;
  }
  const now = Date.now();
  const start = parseApiUtcMs(event.startTime);
  const end = parseApiUtcMs(event.endTime);
  return (
    Number.isFinite(start) && Number.isFinite(end) && start <= now && now <= end
  );
}

/**
 * Classifies an interested event into live / upcoming / ended.
 *
 * @param event - event payload
 */
export function classifyEvent(event: EventResponse): EventBucket {
  const now = Date.now();
  const status = String(event.status || '').toUpperCase();

  if (status === 'CANCELLED') {
    return 'ended';
  }

  // Trust server live flag before client clock/parse checks.
  if (resolveIsOngoing(event)) {
    return 'live';
  }

  const endMs = parseApiUtcMs(event.endTime);
  if (Number.isFinite(endMs) && endMs < now) {
    return 'ended';
  }

  if (status === 'COMPLETED') {
    return 'ended';
  }

  const startMs = parseApiUtcMs(event.startTime);
  if (Number.isFinite(startMs) && startMs > now) {
    return 'upcoming';
  }
  if (
    Number.isFinite(startMs) &&
    Number.isFinite(endMs) &&
    startMs <= now &&
    endMs >= now
  ) {
    return 'live';
  }

  return 'upcoming';
}

/**
 * Partitions interested events into live, upcoming, and ended lists.
 *
 * @param events - raw my-interests list
 */
export function partitionEvents(events: EventResponse[]): {
  live: EventResponse[];
  upcoming: EventResponse[];
  ended: EventResponse[];
} {
  const live: EventResponse[] = [];
  const upcoming: EventResponse[] = [];
  const ended: EventResponse[] = [];

  for (const event of events) {
    const bucket = classifyEvent(event);
    if (bucket === 'live') {
      live.push(event);
    } else if (bucket === 'ended') {
      ended.push(event);
    } else {
      upcoming.push(event);
    }
  }

  live.sort((a, b) => parseApiUtcMs(a.startTime) - parseApiUtcMs(b.startTime));
  upcoming.sort(
    (a, b) => parseApiUtcMs(a.startTime) - parseApiUtcMs(b.startTime),
  );
  ended.sort(
    (a, b) =>
      parseApiUtcMs(b.endTime || b.startTime) -
      parseApiUtcMs(a.endTime || a.startTime),
  );

  return { live, upcoming, ended };
}

/**
 * Author display name with official fallback.
 *
 * @param event - event payload
 */
export function eventAuthorName(event: EventResponse): string {
  if (event.isOfficial) {
    return 'Zen Leader';
  }
  return event.author?.name?.trim() || 'ZenLeader';
}
