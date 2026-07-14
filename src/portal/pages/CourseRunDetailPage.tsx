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
import { SessionRow } from '../components/SessionRow';
import { partitionSessions } from '../utils/sessionHelpers';

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
    <>
      <div className="zl-page-head">
        <div>
          <Link className="zl-back-link" to="/my-courses">
            ← My courses
          </Link>
          <h1>{course?.title || courseRun?.code || 'Course schedule'}</h1>
          <p>
            {isInstructor
              ? 'You are the assigned instructor — host live rooms for this run'
              : 'Live sessions for this course run'}
          </p>
        </div>
        <div className="zl-page-head-actions">
          {isInstructor ? (
            <span className="zl-chip zl-chip-teaching">Teaching</span>
          ) : null}
          <button
            type="button"
            className="zl-btn zl-btn-ghost zl-btn-sm"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="zl-loading">Loading schedule…</div>
      ) : (
        <>
          <section className="zl-section">
            <div className="zl-section-head">
              <div>
                <h2>Live now</h2>
                <p>
                  {isInstructor
                    ? 'Open the room as host (waiting-room approve learners)'
                    : 'Sessions you can join right now'}
                </p>
              </div>
              {live.length > 0 ? (
                <span className="zl-badge-live">
                  <span className="zl-live-dot" aria-hidden />
                  {live.length} live
                </span>
              ) : null}
            </div>
            {live.length === 0 ? (
              <div className="zl-empty">No live sessions right now.</div>
            ) : (
              <div className="zl-list">
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

          <section className="zl-section">
            <div className="zl-section-head">
              <div>
                <h2>Upcoming</h2>
                <p>
                  {isInstructor
                    ? 'You can start a room before the scheduled time'
                    : 'Scheduled live sessions'}
                </p>
              </div>
              <span className="zl-count-chip">{upcoming.length}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="zl-empty">No upcoming sessions.</div>
            ) : (
              <div className="zl-list">
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

          <section className="zl-section zl-section-muted">
            <details>
              <summary className="zl-section-head zl-summary">
                <div>
                  <h2>Ended</h2>
                  <p>Past sessions</p>
                </div>
                <span className="zl-count-chip">{ended.length}</span>
              </summary>
              {ended.length === 0 ? (
                <div className="zl-empty">No ended sessions yet.</div>
              ) : (
                <div className="zl-list zl-list-ended">
                  {ended.map((session) => (
                    <SessionRow
                      key={session.id}
                      session={session}
                      variant="ended"
                      isInstructor={isInstructor}
                      joiningId={joiningId}
                      onJoin={(s) => void joinSession(s)}
                    />
                  ))}
                </div>
              )}
            </details>
          </section>
        </>
      )}
    </>
  );
}
