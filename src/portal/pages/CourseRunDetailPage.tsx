import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import type {
  CourseResponse,
  CourseRunResponse,
  CourseSessionResponse,
  EnrollmentResponse,
} from '../api/types';
import {
  fetchCourse,
  fetchCourseRun,
  fetchMeetingToken,
  fetchMyEnrollments,
  fetchSessions,
  logout,
  redirectToMeeting,
  upsertSessionJoined,
  ZenApiError,
} from '../api/zenleaderApi';
import { PortalLoading } from '../components/PortalLoading';
import { SessionRow } from '../components/SessionRow';
import { partitionSessions } from '../utils/sessionHelpers';
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Badge } from '@/portal/components/ui/badge';
import { Button } from '@/portal/components/ui/button';

/**
 * Returns true when the enrollment role is the assigned course-run instructor.
 *
 * @param role - enrollment role from API
 */
function isInstructorRole(role?: string | null): boolean {
  const normalized = String(role || '').toUpperCase();
  return normalized === 'INSTRUCTOR' || normalized === 'TEACHER';
}

/**
 * Course-run live schedule: Live / Upcoming / Ended sessions with join / host.
 */
export function CourseRunDetailPage() {
  const { courseRunId = '' } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState<CourseResponse | null>(null);
  const [courseRun, setCourseRun] = useState<CourseRunResponse | null>(null);
  const [enrollment, setEnrollment] = useState<EnrollmentResponse | null>(null);
  const [sessions, setSessions] = useState<CourseSessionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const isInstructor = isInstructorRole(enrollment?.role);

  const load = useCallback(async () => {
    if (!courseRunId) {
      return;
    }
    setLoading(true);
    try {
      const [run, enrollments] = await Promise.all([
        fetchCourseRun(courseRunId),
        fetchMyEnrollments(),
      ]);
      const myEnrollment =
        enrollments.find((item) => item.courseRunId === courseRunId) || null;
      const [courseData, sessionList] = await Promise.all([
        fetchCourse(run.courseId),
        fetchSessions(courseRunId),
      ]);
      setCourseRun(run);
      setCourse(courseData);
      setEnrollment(myEnrollment);
      setSessions(sessionList);
      setError(null);
    } catch (err) {
      if (err instanceof ZenApiError && err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to load schedule.');
    } finally {
      setLoading(false);
    }
  }, [courseRunId, navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  const { live, upcoming, ended } = useMemo(
    () => partitionSessions(sessions),
    [sessions],
  );

  const joinSession = async (session: CourseSessionResponse) => {
    const roomCode = session.meetingRoomId?.trim();
    if (!roomCode) {
      setError('This session has no room yet.');
      return;
    }
    setError(null);
    setJoiningId(session.id);
    try {
      const token = await fetchMeetingToken(roomCode);
      try {
        await upsertSessionJoined(courseRunId, session.id);
      } catch {
        // attendance is best-effort; still allow join
      }
      redirectToMeeting(token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to join room');
      setJoiningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="ghost" size="sm" className="mb-2 -ml-2 px-2" asChild>
            <Link to="/my-courses">← My courses</Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {course?.title || courseRun?.code || 'Course schedule'}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isInstructor
              ? 'You are the assigned instructor — host live rooms for this run'
              : 'Live sessions for this course run'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isInstructor ? <Badge variant="secondary">Teaching</Badge> : null}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <PortalLoading message="Loading schedule…" />
      ) : (
        <>
          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Live now</h2>
                <p className="text-sm text-muted-foreground">
                  {isInstructor
                    ? 'Open the room as host (waiting-room approve learners)'
                    : 'Sessions you can join right now'}
                </p>
              </div>
              {live.length > 0 ? (
                <Badge className="gap-1.5 bg-destructive text-white hover:bg-destructive">
                  <span className="size-1.5 animate-pulse rounded-full bg-white" />
                  {live.length} live
                </Badge>
              ) : null}
            </div>
            {live.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No live sessions right now.
              </p>
            ) : (
              <div className="space-y-3">
                {live.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    variant="live"
                    isInstructor={isInstructor}
                    joiningId={joiningId}
                    onJoin={(s) => void joinSession(s)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Upcoming</h2>
                <p className="text-sm text-muted-foreground">
                  {isInstructor
                    ? 'You can start a room before the scheduled time'
                    : 'Scheduled live sessions'}
                </p>
              </div>
              <Badge variant="secondary">{upcoming.length}</Badge>
            </div>
            {upcoming.length === 0 ? (
              <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                No upcoming sessions.
              </p>
            ) : (
              <div className="space-y-3">
                {upcoming.map((session) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    variant="upcoming"
                    isInstructor={isInstructor}
                    joiningId={joiningId}
                    onJoin={(s) => void joinSession(s)}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <details>
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg border bg-card px-4 py-3">
                <div>
                  <h2 className="text-lg font-semibold">Ended</h2>
                  <p className="text-sm text-muted-foreground">Past sessions</p>
                </div>
                <Badge variant="secondary">{ended.length}</Badge>
              </summary>
              <div className="mt-3 space-y-3">
                {ended.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                    No ended sessions yet.
                  </p>
                ) : (
                  ended.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      variant="ended"
                      isInstructor={isInstructor}
                      joiningId={joiningId}
                      onJoin={(s) => void joinSession(s)}
                    />
                  ))
                )}
              </div>
            </details>
          </section>
        </>
      )}
    </div>
  );
}
