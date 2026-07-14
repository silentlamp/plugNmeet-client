import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { EnrichedEnrollment } from '../api/types';
import {
  fetchCourse,
  fetchCourseRun,
  fetchMyEnrollments,
  logout,
  ZenApiError,
} from '../api/zenleaderApi';
import { CourseEnrollmentCard } from '../components/CourseEnrollmentCard';

/**
 * Lists the signed-in user's enrollments with course metadata.
 */
export function MyCoursesPage() {
  const [items, setItems] = useState<EnrichedEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const enrollments = await fetchMyEnrollments();
      const enriched = await Promise.all(
        enrollments.map(async (enrollment) => {
          const courseRun = await fetchCourseRun(enrollment.courseRunId);
          const course = await fetchCourse(courseRun.courseId);
          return { enrollment, courseRun, course };
        }),
      );
      setItems(enriched);
      setError(null);
    } catch (err) {
      if (err instanceof ZenApiError && err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setItems([]);
      setError(err instanceof Error ? err.message : 'Unable to load courses.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <div className="zl-page-head">
        <div>
          <h1>My courses</h1>
          <p>Courses you enrolled in — open a run to see the live schedule</p>
        </div>
        <button
          type="button"
          className="zl-btn zl-btn-ghost zl-btn-sm"
          onClick={() => void load()}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="zl-loading">Loading your courses…</div>
      ) : items.length === 0 ? (
        <div className="zl-empty">
          No enrollments yet. Purchase or enroll in a course in the ZenLeader
          app to see it here.
        </div>
      ) : (
        <div className="zl-list">
          {items.map((item) => (
            <CourseEnrollmentCard key={item.enrollment.id} item={item} />
          ))}
        </div>
      )}
    </>
  );
}
