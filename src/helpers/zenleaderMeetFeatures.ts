/**
 * ZenLeader Meet client-side feature gates.
 *
 * Room metadata from the server may still allow these capabilities; these flags
 * hide the corresponding menu entries and settings so the Meet UI stays lean.
 *
 * Transcription (including speech translation / subtitle target langs) stays
 * available — only standalone chat translation is gated off.
 */
export const ZL_MEET_FEATURES = {
  /** AI tools / AI text-chat entry points in menus and footer. */
  aiTools: false,
  /** RTMP / start live stream admin menu. */
  liveStream: false,
  /** Shared notepad admin toggle and footer icon. */
  sharedNotepad: false,
  /**
   * Excalidraw whiteboard footer icon, menus, lock options, and NATS sync.
   * Disabled for ZenLeader — mobile does not support whiteboard, and LMS
   * sessions use A/V + chat instead.
   */
  whiteboard: false,
  /**
   * Standalone chat-message translation tab (Insights chat translation).
   * Does not affect transcription speech translation / subtitle langs.
   */
  chatTranslation: false,
  /** Share / display external link admin menu. */
  displayExternalLink: false,
  /**
   * Chat file attachment / upload button (and paste-to-upload).
   * Disabled for ZenLeader meetings — file sharing is not supported.
   */
  chatFileUpload: false,
} as const;
