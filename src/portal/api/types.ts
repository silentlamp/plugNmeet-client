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

/** Event item from /api/v1/events/my-interests or /my-created */
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
  /** Jackson sometimes serializes boolean `isOngoing` as `ongoing`. */
  ongoing?: boolean;
  isOfficial?: boolean;
  author?: EventAuthor | null;
};

/** GET /api/v1/enrollments/me */
export type EnrollmentResponse = {
  id: string;
  userId?: string;
  courseRunId: string;
  courseRunCode?: string;
  status?: string;
  role?: string;
  progressPercent?: number | null;
  enrolledAt?: string;
  lastAccessedAt?: string;
};

/** GET /api/v1/course-runs/{id} */
export type CourseRunResponse = {
  id: string;
  courseId: string;
  code?: string;
  status?: string;
  startsAt?: string;
  endsAt?: string;
  timezone?: string;
};

/** GET /api/v1/courses/{id} */
export type CourseResponse = {
  id: string;
  title?: string;
  description?: string;
  thumbnailUrl?: string | null;
};

/** GET /api/v1/sessions?courseRunId= */
export type CourseSessionResponse = {
  id: string;
  courseRunId: string;
  courseRunCode?: string;
  title?: string;
  description?: string;
  sessionNumber?: number;
  orderIndex?: number;
  scheduledAt?: string;
  durationMinutes?: number;
  meetingRoomId?: string | null;
  status?: string;
  recordingUrl?: string | null;
};

/** Enrollment card model after fan-out enrichment. */
export type EnrichedEnrollment = {
  enrollment: EnrollmentResponse;
  courseRun: CourseRunResponse;
  course: CourseResponse;
};
