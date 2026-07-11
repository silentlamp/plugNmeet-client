/** Standard ZenLeader API envelope. */
export type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  errorMessage?: {
    message?: string;
    code?: string;
  };
};

/** POST /api/v1/auth/token */
export type TokenResponse = {
  authenticated?: boolean;
  accessToken: string;
  refreshToken?: string;
};

/** GET /api/v1/meetings/token */
export type MeetingTokenResponse = {
  token: string;
  roomCode?: string;
};

/** Author nested in event responses. */
export type EventAuthor = {
  id?: string;
  name?: string;
  avatarUrl?: string | null;
};

/** Event item from /api/v1/events/my-interests */
export type EventResponse = {
  id: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string | null;
  liveLink?: string | null;
  startTime?: string;
  endTime?: string;
  status?: string;
  roomCode?: string | null;
  isOngoing?: boolean;
  isOfficial?: boolean;
  author?: EventAuthor | null;
};
