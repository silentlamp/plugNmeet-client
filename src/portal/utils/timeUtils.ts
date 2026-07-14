/**
 * Parses an API Instant/ISO timestamp stored as UTC.
 *
 * Jackson/`Instant` may omit the `Z` suffix. ES Date and naive parsers then
 * treat the value as local wall-clock, which shifts comparisons by the
 * client offset (e.g. UTC+7) and mis-classifies live events as ended.
 *
 * @param iso - ISO-8601 string from the ZenLeader API
 * @returns epoch millis, or NaN if unparseable
 */
export function parseApiUtcMs(iso?: string | null): number {
  if (!iso) {
    return Number.NaN;
  }
  const raw = String(iso).trim();
  if (!raw) {
    return Number.NaN;
  }

  // Already has Z or ±HH:MM / ±HHMM offset.
  if (/([zZ]|[+-]\d{2}:?\d{2})$/.test(raw)) {
    return new Date(raw).getTime();
  }

  // Date-only → UTC midnight.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return new Date(`${raw}T00:00:00.000Z`).getTime();
  }

  // Bare local-looking datetime from Instant — force UTC.
  const withT = raw.includes('T') ? raw : raw.replace(' ', 'T');
  return new Date(`${withT}Z`).getTime();
}

/**
 * Formats an API UTC timestamp in the user's local timezone.
 *
 * @param iso - API timestamp
 * @param options - Intl options
 */
export function formatApiUtcLocal(
  iso?: string | null,
  options?: Intl.DateTimeFormatOptions,
): string {
  const ms = parseApiUtcMs(iso);
  if (!Number.isFinite(ms)) {
    return iso ? String(iso) : '';
  }
  return new Date(ms).toLocaleString('vi-VN', options);
}
