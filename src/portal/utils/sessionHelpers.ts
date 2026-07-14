import type { CourseSessionResponse } from '../api/types';
import { formatApiUtcLocal, parseApiUtcMs } from './timeUtils';

export type SessionBucket = 'live' | 'upcoming' | 'ended';

/**
 * Formats a session schedule timestamp in the user's local timezone.
 *
 * @param iso - scheduledAt ISO string (UTC from API)
 */
export function formatSessionTime(iso?: string): string {
  return formatApiUtcLocal(iso, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Classifies an LMS course session into live / upcoming / ended.
 *
 * @param session - course session payload
 */
export function classifySession(session: CourseSessionResponse): SessionBucket {
  const status = String(session.status || '').toUpperCase();
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'ENDED') {
    return 'ended';
  }

  if (!session.scheduledAt) {
    return status === 'LIVE' || status === 'ONGOING' ? 'live' : 'upcoming';
  }

  const start = parseApiUtcMs(session.scheduledAt);
  if (!Number.isFinite(start)) {
    return status === 'LIVE' || status === 'ONGOING' ? 'live' : 'upcoming';
  }

  const durationMs = Math.max(1, session.durationMinutes || 60) * 60_000;
  const end = start + durationMs;
  const now = Date.now();

  if (end < now) {
    return 'ended';
  }
  if (status === 'LIVE' || status === 'ONGOING') {
    return 'live';
  }
  if (start <= now && now <= end) {
    return 'live';
  }
  if (start > now) {
    return 'upcoming';
  }

  return 'upcoming';
}

/**
 * Partitions course sessions into live, upcoming, and ended lists.
 *
 * @param sessions - raw sessions for a course run
 */
export function partitionSessions(sessions: CourseSessionResponse[]): {
  live: CourseSessionResponse[];
  upcoming: CourseSessionResponse[];
  ended: CourseSessionResponse[];
} {
  const live: CourseSessionResponse[] = [];
  const upcoming: CourseSessionResponse[] = [];
  const ended: CourseSessionResponse[] = [];

  for (const session of sessions) {
    const bucket = classifySession(session);
    if (bucket === 'live') {
      live.push(session);
    } else if (bucket === 'ended') {
      ended.push(session);
    } else {
      upcoming.push(session);
    }
  }

  const byStart = (a: CourseSessionResponse, b: CourseSessionResponse) =>
    parseApiUtcMs(a.scheduledAt) - parseApiUtcMs(b.scheduledAt);

  live.sort(byStart);
  upcoming.sort(byStart);
  ended.sort(
    (a, b) => parseApiUtcMs(b.scheduledAt) - parseApiUtcMs(a.scheduledAt),
  );

  return { live, upcoming, ended };
}

/**
 * Returns whether a session can be joined (has meeting room id).
 *
 * @param session - course session
 */
export function canJoinSession(session: CourseSessionResponse): boolean {
  return Boolean(session.meetingRoomId?.trim());
}
