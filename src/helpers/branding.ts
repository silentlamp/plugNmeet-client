declare const BUILD_TIME: number;

/** Matches upstream PlugNMeet / MynaParrot hosts that must not appear in user-facing UI. */
const BLOCKED_BRANDING_PATTERN = /plugnmeet|mynaparrot/i;

/**
 * Room-settings footer credit (replaces Powered-by + Server/Client version line).
 */
export const ZL_MEET_CREDIT_TEXT = 'Được phát triển bởi Blue Ocean Digital';

/**
 * When true, append Server/Client version after the credit (legacy PlugNMeet footer).
 * Kept for easy restore; ZenLeader hides versions by default.
 */
export const ZL_MEET_SHOW_VERSION_FOOTER = false;

/**
 * Default HTML copyright text sent/stored with room metadata.
 */
export const ZL_MEET_COPYRIGHT_HTML = 'Được phát triển bởi Blue Ocean Digital';

/**
 * Returns whether a URL points at disallowed third-party meet branding.
 *
 * @param url candidate logo or asset URL
 */
export function isBlockedBrandingUrl(url: string): boolean {
  return BLOCKED_BRANDING_PATTERN.test(url);
}

/**
 * Builds the default ZenLeader meet header logo URL with a deploy-time cache buster.
 *
 * @param assetPath static assets base from {@code plugNmeetConfig.staticAssetsPath}
 */
export function resolveZenLeaderLogoPath(assetPath: string): string {
  return `${assetPath}/imgs/logo-zenleader.png?v=${BUILD_TIME}`;
}
