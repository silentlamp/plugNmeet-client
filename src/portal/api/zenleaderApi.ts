import {
  clearZenSession,
  getZenAccessToken,
  getZenRefreshToken,
  saveZenSession,
} from '../auth/session';
import type {
  ApiResponse,
  CourseResponse,
  CourseRunResponse,
  CourseSessionResponse,
  EnrollmentResponse,
  EventResponse,
  MeetingTokenResponse,
  TokenResponse,
} from './types';

export class ZenApiError extends Error {
  status: number;

  /**
   * Creates an API error with HTTP status for portal callers.
   *
   * @param message - human-readable error message
   * @param status - HTTP status code
   */
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ZenApiError';
    this.status = status;
  }
}

type PlugNmeetConfig = {
  apiBaseUrl?: string;
  serverUrl?: string;
  meetHomeUrl?: string;
  portalUrl?: string;
};

/**
 * Reads `window.plugNmeetConfig` safely.
 */
function getConfig(): PlugNmeetConfig {
  return (
    (window as unknown as { plugNmeetConfig?: PlugNmeetConfig })
      .plugNmeetConfig || {}
  );
}

/**
 * Resolves the ZenLeader Java API base URL from `plugNmeetConfig.apiBaseUrl`.
 */
export function getApiBaseUrl(): string {
  const cfg = getConfig();
  if (cfg.apiBaseUrl) {
    return String(cfg.apiBaseUrl).replace(/\/$/, '');
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  return 'https://api.zenleader.xyz';
}

/**
 * Resolves the meeting SPA home URL (always meet domain in production).
 */
export function getMeetHomeUrl(): string {
  const cfg = getConfig();
  if (cfg.meetHomeUrl) {
    return String(cfg.meetHomeUrl).replace(/\/?$/, '/');
  }
  if (cfg.serverUrl) {
    return String(cfg.serverUrl).replace(/\/?$/, '/');
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return `${window.location.origin}/`;
  }
  return 'https://meet.zenleader.xyz/';
}

/**
 * Resolves the learner portal base URL.
 */
export function getPortalUrl(): string {
  const cfg = getConfig();
  if (cfg.portalUrl) {
    return String(cfg.portalUrl).replace(/\/$/, '');
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return window.location.origin;
  }
  if (host === 'portal.zenleader.xyz') {
    return 'https://portal.zenleader.xyz';
  }
  return 'https://portal.zenleader.xyz';
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
};

/**
 * Low-level JSON fetch against the ZenLeader API with optional Bearer auth.
 *
 * @param path - API path beginning with `/api/...`
 * @param options - method, body, and auth skip flag
 */
async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const token = getZenAccessToken();
  if (token && !options.skipAuth) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON error body
  }

  if (!res.ok) {
    const msg =
      json?.errorMessage?.message ||
      json?.message ||
      res.statusText ||
      'Request failed';
    throw new ZenApiError(msg, res.status);
  }

  return (json?.data ?? json) as T;
}

/**
 * Signs in with email + password (sent as `passwordHash`, matching mobile/admin).
 *
 * @param email - account email
 * @param password - plaintext password (backend field name is passwordHash)
 */
export async function loginWithPassword(
  email: string,
  password: string,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/api/v1/auth/token', {
    method: 'POST',
    skipAuth: true,
    body: { email, passwordHash: password },
  });

  if (!data?.accessToken) {
    throw new ZenApiError('Sign in failed', 401);
  }

  saveZenSession(data.accessToken, data.refreshToken, email);
  return data;
}

/**
 * Logs out via refresh token when available, then clears local session.
 */
export async function logout(): Promise<void> {
  const refresh = getZenRefreshToken();
  try {
    if (refresh) {
      await apiFetch<void>('/api/v1/auth/logout', {
        method: 'POST',
        body: { refreshToken: refresh },
      });
    }
  } catch {
    // ignore logout network errors; always clear local session
  }
  clearZenSession();
}

/**
 * Loads events the authenticated user marked as interested.
 */
export async function fetchMyInterests(): Promise<EventResponse[]> {
  const data = await apiFetch<EventResponse[]>('/api/v1/events/my-interests');
  return Array.isArray(data) ? data : [];
}

/**
 * Loads the current user's course enrollments.
 */
export async function fetchMyEnrollments(): Promise<EnrollmentResponse[]> {
  const data = await apiFetch<EnrollmentResponse[]>('/api/v1/enrollments/me');
  return Array.isArray(data) ? data : [];
}

/**
 * Loads a course run by id.
 *
 * @param courseRunId - course run id
 */
export async function fetchCourseRun(
  courseRunId: string,
): Promise<CourseRunResponse> {
  return apiFetch<CourseRunResponse>(
    `/api/v1/course-runs/${encodeURIComponent(courseRunId)}`,
  );
}

/**
 * Loads a course by id.
 *
 * @param courseId - course id
 */
export async function fetchCourse(courseId: string): Promise<CourseResponse> {
  return apiFetch<CourseResponse>(
    `/api/v1/courses/${encodeURIComponent(courseId)}`,
  );
}

/**
 * Loads LMS live sessions for a course run.
 *
 * @param courseRunId - course run id
 */
export async function fetchSessions(
  courseRunId: string,
): Promise<CourseSessionResponse[]> {
  const data = await apiFetch<CourseSessionResponse[]>(
    `/api/v1/sessions?courseRunId=${encodeURIComponent(courseRunId)}`,
  );
  return Array.isArray(data) ? data : [];
}

/**
 * Records JOINED attendance for a course session (mobile parity).
 *
 * @param courseRunId - course run id
 * @param sessionId - session id
 */
export async function upsertSessionJoined(
  courseRunId: string,
  sessionId: string,
): Promise<void> {
  await apiFetch(
    `/api/v1/progress/me/course-runs/${encodeURIComponent(courseRunId)}/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: 'PUT',
      body: { status: 'JOINED' },
    },
  );
}

/**
 * Requests a PlugNMeet join token for the given room code.
 *
 * @param roomCode - live session / event room code
 */
export async function fetchMeetingToken(roomCode: string): Promise<string> {
  const code = roomCode.trim();
  if (!code) {
    throw new ZenApiError('Please enter a room code', 400);
  }

  const data = await apiFetch<MeetingTokenResponse>(
    `/api/v1/meetings/token?roomCode=${encodeURIComponent(code)}`,
  );

  if (!data?.token) {
    throw new ZenApiError('No meeting token received', 500);
  }

  return data.token;
}

/**
 * Navigates into the meeting SPA with a PlugNMeet access token.
 *
 * @param meetToken - PlugNMeet join token (not the ZenLeader JWT)
 */
export function redirectToMeeting(meetToken: string): void {
  const url = `${getMeetHomeUrl()}?access_token=${encodeURIComponent(meetToken)}`;
  window.location.href = url;
}
