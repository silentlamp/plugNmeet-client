import {
  clearZenSession,
  getZenAccessToken,
  getZenEmail,
  getZenRefreshToken,
  saveZenSession,
} from '../auth/session';
import type {
  ApiResponse,
  AppleAuthPayload,
  CourseResponse,
  CourseRunResponse,
  CourseSessionResponse,
  CreateEventPayload,
  CreateInstantMeetingPayload,
  EnrollmentResponse,
  EventResponse,
  MeetingTokenResponse,
  PresignedUploadResponse,
  TokenResponse,
  UserMeResponse,
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
 * Reads `window.plugNmeetConfig` safely (shared URLs only — not OAuth).
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

/**
 * Returns the Google Web OAuth client ID from Vite env (empty if unset).
 * Source: `.env` / `.env.production` → `VITE_PORTAL_GOOGLE_CLIENT_ID`.
 */
export function getGoogleClientId(): string {
  return String(import.meta.env.VITE_PORTAL_GOOGLE_CLIENT_ID ?? '').trim();
}

/**
 * Returns the Apple Services ID from Vite env (empty if unset / button hidden).
 * Source: `.env` / `.env.production` → `VITE_PORTAL_APPLE_CLIENT_ID`.
 */
export function getAppleClientId(): string {
  return String(import.meta.env.VITE_PORTAL_APPLE_CLIENT_ID ?? '').trim();
}

/**
 * Loads the signed-in user profile (`GET /api/v1/users/me`).
 */
export async function fetchCurrentUser(): Promise<UserMeResponse> {
  return apiFetch<UserMeResponse>('/api/v1/users/me');
}

/**
 * Persists tokens and best-effort email after a successful auth exchange.
 *
 * @param data - token pair from password or social login
 * @param fallbackEmail - email from the login form when known
 */
async function persistAuthSession(
  data: TokenResponse,
  fallbackEmail?: string,
): Promise<TokenResponse> {
  if (!data?.accessToken) {
    throw new ZenApiError('Sign in failed', 401);
  }
  saveZenSession(data.accessToken, data.refreshToken, fallbackEmail);
  try {
    const me = await fetchCurrentUser();
    if (me?.email) {
      saveZenSession(data.accessToken, data.refreshToken, me.email);
    }
  } catch {
    // profile fetch is best-effort; tokens already stored
  }
  return data;
}

type FetchOptions = {
  method?: string;
  body?: unknown;
  skipAuth?: boolean;
  /** Internal: set after a successful token refresh to avoid retry loops. */
  _retry?: boolean;
};

/** In-flight refresh shared across concurrent 401s (single-flight). */
let refreshPromise: Promise<TokenResponse> | null = null;

/**
 * Returns true when the path is an auth endpoint that must not trigger refresh.
 *
 * @param path - API path beginning with `/api/...`
 */
function isAuthSessionPath(path: string): boolean {
  return (
    path.includes('/auth/token') ||
    path.includes('/auth/refresh') ||
    path.includes('/auth/logout') ||
    path.includes('/auth/google') ||
    path.includes('/auth/apple')
  );
}

/**
 * Raw JSON fetch against the ZenLeader API (no 401 refresh handling).
 *
 * @param path - API path beginning with `/api/...`
 * @param options - method, body, and auth skip flag
 */
async function rawApiFetch<T>(
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
 * Exchanges the stored refresh token for a new access/refresh pair.
 *
 * @throws ZenApiError when refresh token is missing or the refresh call fails
 */
async function refreshZenTokens(): Promise<TokenResponse> {
  const refresh = getZenRefreshToken();
  if (!refresh) {
    throw new ZenApiError('No refresh token', 401);
  }

  const data = await rawApiFetch<TokenResponse>('/api/v1/auth/refresh', {
    method: 'POST',
    skipAuth: true,
    body: { refreshToken: refresh },
  });

  if (!data?.accessToken) {
    throw new ZenApiError('Token refresh failed', 401);
  }

  saveZenSession(
    data.accessToken,
    data.refreshToken || refresh,
    getZenEmail() || undefined,
  );
  return data;
}

/**
 * Single-flight refresh so concurrent 401s share one `/auth/refresh` call.
 */
async function refreshAccessTokenSingleFlight(): Promise<TokenResponse> {
  if (!refreshPromise) {
    refreshPromise = refreshZenTokens().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

/**
 * JSON fetch against the ZenLeader API with optional Bearer auth.
 * On 401, attempts one automatic access-token refresh then retries.
 *
 * @param path - API path beginning with `/api/...`
 * @param options - method, body, and auth skip flag
 */
async function apiFetch<T>(
  path: string,
  options: FetchOptions = {},
): Promise<T> {
  try {
    return await rawApiFetch<T>(path, options);
  } catch (err) {
    if (
      !(err instanceof ZenApiError) ||
      err.status !== 401 ||
      options.skipAuth ||
      options._retry ||
      isAuthSessionPath(path)
    ) {
      throw err;
    }

    if (!getZenRefreshToken()) {
      throw err;
    }

    try {
      await refreshAccessTokenSingleFlight();
      return await rawApiFetch<T>(path, { ...options, _retry: true });
    } catch {
      clearZenSession();
      throw err;
    }
  }
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
  return persistAuthSession(data, email);
}

/**
 * Signs in with a Google ID token from Google Identity Services.
 *
 * @param idToken - Google JWT credential
 */
export async function loginWithGoogle(idToken: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/api/v1/auth/google', {
    method: 'POST',
    skipAuth: true,
    body: { idToken },
  });
  return persistAuthSession(data);
}

/**
 * Signs in with Apple identity token + authorization code from Apple JS SDK.
 *
 * @param payload - Apple auth fields matching {@code AppleAuthRequest}
 */
export async function loginWithApple(
  payload: AppleAuthPayload,
): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>('/api/v1/auth/apple', {
    method: 'POST',
    skipAuth: true,
    body: payload,
  });
  return persistAuthSession(data);
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
 * Loads events created by the authenticated user (includes drafts).
 */
export async function fetchMyCreated(): Promise<EventResponse[]> {
  const data = await apiFetch<EventResponse[]>('/api/v1/events/my-created');
  return Array.isArray(data) ? data : [];
}

/**
 * Creates an event owned by the authenticated user (auto room code + live session).
 *
 * @param payload - title, schedule, thumbnail, and publish flag
 */
export async function createEvent(
  payload: CreateEventPayload,
): Promise<EventResponse> {
  return apiFetch<EventResponse>('/api/v1/events', {
    method: 'POST',
    body: payload,
  });
}

/**
 * Requests a presigned PUT URL for uploading an asset (authenticated learner).
 *
 * @param fileName - original file name
 * @param contentType - MIME type
 */
export async function getPresignedUpload(
  fileName: string,
  contentType: string,
): Promise<PresignedUploadResponse> {
  const q = new URLSearchParams({ fileName, contentType });
  return apiFetch<PresignedUploadResponse>(
    `/api/v1/assets/presigned-upload?${q.toString()}`,
  );
}

/**
 * Uploads a file via presigned PUT and returns the public download URL payload.
 *
 * @param file - image or other asset selected by the user
 */
export async function uploadViaPresigned(
  file: File,
): Promise<PresignedUploadResponse> {
  const presigned = await getPresignedUpload(
    file.name,
    file.type || 'application/octet-stream',
  );
  const response = await fetch(presigned.uploadUrl, {
    method: 'PUT',
    body: file,
    headers: {
      'Content-Type': file.type || 'application/octet-stream',
    },
  });
  if (!response.ok) {
    throw new ZenApiError('Image upload failed.', response.status);
  }
  return presigned;
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
 * Creates an instant (unlinked) meeting for the signed-in host and returns token + room code.
 *
 * @param payload - optional meeting title
 */
export async function createInstantMeeting(
  payload: CreateInstantMeetingPayload = {},
): Promise<MeetingTokenResponse> {
  const data = await apiFetch<MeetingTokenResponse>(
    '/api/v1/meetings/instant',
    {
      method: 'POST',
      body: payload,
    },
  );

  if (!data?.token) {
    throw new ZenApiError('No meeting token received', 500);
  }

  return data;
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
