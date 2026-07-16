import { Link } from 'react-router-dom';

import type { EnrichedEnrollment } from '../api/types';
import { Badge } from '@/portal/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';

type CourseEnrollmentCardProps = {
  item: EnrichedEnrollment;
};

/**
 * Enrollment card linking to the course-run live schedule (shadcn Card).
 *
 * @param item - enriched enrollment with course metadata
 */
export function CourseEnrollmentCard({ item }: CourseEnrollmentCardProps) {
  const { enrollment, course, courseRun } = item;
  const title = course.title || courseRun.code || 'Course';
  const thumb = course.thumbnailUrl || '/assets/imgs/logo-zenleader.png';
  const progress =
    typeof enrollment.progressPercent === 'number'
      ? Math.max(0, Math.min(100, enrollment.progressPercent))
      : null;
  const role = String(enrollment.role || '').toUpperCase();
  const isInstructor = role === 'INSTRUCTOR' || role === 'TEACHER';

  return (
    <Card className="gap-0 overflow-hidden py-0 shadow-sm transition-colors hover:bg-accent/30">
      <Link
        to={`/my-courses/${enrollment.courseRunId}`}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-3 px-4 pt-4 pb-2">
          <div className="min-w-0">
            <CardTitle className="truncate text-base">{title}</CardTitle>
            <CardDescription className="truncate">
              Run {courseRun.code || enrollment.courseRunCode || '—'}
              {enrollment.status ? ` · ${enrollment.status}` : ''}
            </CardDescription>
          </div>
          {isInstructor ? (
            <Badge variant="secondary" className="shrink-0">
              Teaching
            </Badge>
          ) : null}
        </CardHeader>
        <CardContent className="flex gap-4 px-4 pb-4">
          <div className="min-w-0 flex-1 space-y-2">
            {isInstructor ? (
              <p className="text-xs text-muted-foreground">
                Open schedule to host live class rooms
              </p>
            ) : null}
            {progress !== null && !isInstructor ? (
              <div className="space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{progress}%</p>
              </div>
            ) : null}
          </div>
          <div className="size-16 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-20">
            <img
              src={thumb}
              alt=""
              className="size-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/imgs/logo-zenleader.png';
              }}
            />
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
