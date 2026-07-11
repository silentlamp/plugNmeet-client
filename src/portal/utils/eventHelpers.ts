import type { EventResponse } from '../api/types';

export type EventBucket = 'live' | 'upcoming' | 'ended';

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
 * Formats an ISO timestamp for hub cards.
 *
 * @param iso - event time
 */
export function formatEventTime(iso?: string): string {
  if (!iso) {
    return '';
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return String(iso);
  }
}

/**
 * Formats a compact time range for card meta.
 *
 * @param start - start ISO
 * @param end - end ISO
 */
export function formatEventRange(start?: string, end?: string): string {
  const a = formatEventTime(start);
  const b = formatEventTime(end);
  if (a && b) {
    return `${a} → ${b}`;
  }
  return a || b || '';
}

/**
 * Classifies an interested event into live / upcoming / ended.
 *
 * @param event - event payload
 */
export function classifyEvent(event: EventResponse): EventBucket {
  const now = Date.now();
  if (String(event.status || '').toUpperCase() === 'COMPLETED') {
    return 'ended';
  }
  if (event.isOngoing) {
    return 'live';
  }
  try {
    if (event.endTime && new Date(event.endTime).getTime() < now) {
      return 'ended';
    }
    if (event.startTime && new Date(event.startTime).getTime() > now) {
      return 'upcoming';
    }
    if (event.endTime && new Date(event.endTime).getTime() >= now) {
      return 'live';
    }
  } catch {
    // fall through
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

  live.sort(
    (a, b) =>
      new Date(a.startTime || 0).getTime() -
      new Date(b.startTime || 0).getTime(),
  );
  upcoming.sort(
    (a, b) =>
      new Date(a.startTime || 0).getTime() -
      new Date(b.startTime || 0).getTime(),
  );
  ended.sort(
    (a, b) =>
      new Date(b.endTime || b.startTime || 0).getTime() -
      new Date(a.endTime || a.startTime || 0).getTime(),
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
