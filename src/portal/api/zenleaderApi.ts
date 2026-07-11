import {
  clearZenSession,
  getZenAccessToken,
  getZenRefreshToken,
  saveZenSession,
} from '../auth/session';
import type {
  ApiResponse,
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

/**
 * Resolves the ZenLeader Java API base URL from `plugNmeetConfig.apiBaseUrl`.
 * Local/prod defaults apply only when config is missing (no alternate global aliases).
 */
export function getApiBaseUrl(): string {
  const cfg = (
    window as unknown as { plugNmeetConfig?: { apiBaseUrl?: string } }
  ).plugNmeetConfig;
  if (cfg?.apiBaseUrl) {
    return String(cfg.apiBaseUrl).replace(/\/$/, '');
  }
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'http://localhost:8080';
  }
  return 'https://api.zenleader.xyz';
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
 * Builds the meeting home URL (`/`) from the current portal location.
 */
export function getMeetHomeUrl(): string {
  return `${window.location.origin}/`;
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
