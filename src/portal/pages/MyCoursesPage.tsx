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
import { PortalLoading } from '../components/PortalLoading';
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Button } from '@/portal/components/ui/button';

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
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My courses</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Courses you enrolled in — open a run to see the live schedule
          </p>
        </div>
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {loading ? (
        <PortalLoading message="Loading your courses…" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-sm text-muted-foreground">
          No enrollments yet. Purchase or enroll in a course in the ZenLeader
          app to see it here.
        </p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <CourseEnrollmentCard key={item.enrollment.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
