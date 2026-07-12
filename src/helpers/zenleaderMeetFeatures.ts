/**
 * ZenLeader Meet client-side feature gates.
 *
 * Room metadata from the server may still allow these capabilities; these flags
 * hide the corresponding menu entries and settings so the Meet UI stays lean.
 */
export const ZL_MEET_FEATURES = {
  /** AI tools / AI text-chat entry points in menus and footer. */
  aiTools: false,
  /** RTMP / start live stream admin menu. */
  liveStream: false,
  /** Shared notepad admin toggle and footer icon. */
  sharedNotepad: false,
  /** Live translation UI (transcription remains available). */
  translation: false,
} as const;
