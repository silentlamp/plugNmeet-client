const STORAGE_ACCESS = 'zl_meet_access_token';
const STORAGE_REFRESH = 'zl_meet_refresh_token';
const STORAGE_EMAIL = 'zl_meet_email';

/**
 * Returns the stored ZenLeader access JWT for the meet portal, if any.
 */
export function getZenAccessToken(): string {
  return localStorage.getItem(STORAGE_ACCESS) || '';
}

/**
 * Returns the stored refresh token for logout and automatic access-token refresh.
 */
export function getZenRefreshToken(): string {
  return localStorage.getItem(STORAGE_REFRESH) || '';
}

/**
 * Returns the email saved at last successful portal sign-in.
 */
export function getZenEmail(): string {
  return localStorage.getItem(STORAGE_EMAIL) || '';
}

/**
 * Persists ZenLeader auth tokens (and optional email) in localStorage.
 *
 * @param accessToken - JWT access token from `/api/v1/auth/token`
 * @param refreshToken - optional refresh token
 * @param email - optional signed-in email for hub display
 */
export function saveZenSession(
  accessToken: string,
  refreshToken?: string,
  email?: string,
): void {
  localStorage.setItem(STORAGE_ACCESS, accessToken);
  if (refreshToken) {
    localStorage.setItem(STORAGE_REFRESH, refreshToken);
  }
  if (email) {
    localStorage.setItem(STORAGE_EMAIL, email);
  }
}

/**
 * Clears all ZenLeader meet-portal session keys from localStorage.
 */
export function clearZenSession(): void {
  localStorage.removeItem(STORAGE_ACCESS);
  localStorage.removeItem(STORAGE_REFRESH);
  localStorage.removeItem(STORAGE_EMAIL);
}

/**
 * Whether the portal currently has an access token stored.
 */
export function hasZenSession(): boolean {
  return Boolean(getZenAccessToken());
}
