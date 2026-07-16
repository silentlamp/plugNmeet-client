import { Link } from 'react-router-dom';

import type { EnrichedEnrollment } from '../api/types';

type CourseEnrollmentCardProps = {
  item: EnrichedEnrollment;
};

/**
 * Compact enrollment row linking to the course-run live schedule.
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
    <article className="zl-row">
      <Link
        className="zl-row-main zl-row-link"
        to={`/my-courses/${enrollment.courseRunId}`}
      >
        <div className="zl-row-top">
          <div className="zl-row-author-text">
            <span className="zl-author-name">{title}</span>
            <span className="zl-author-hint">
              Run {courseRun.code || enrollment.courseRunCode || '—'}
              {enrollment.status ? ` · ${enrollment.status}` : ''}
            </span>
          </div>
          {isInstructor ? (
            <span className="zl-chip zl-chip-teaching">Teaching</span>
          ) : null}
        </div>
        <div className="zl-row-body">
          <div className="zl-row-copy">
            {isInstructor ? (
              <p className="zl-card-time">
                Open schedule to host live class rooms
              </p>
            ) : null}
            {progress !== null && !isInstructor ? (
              <div className="zl-progress">
                <div
                  className="zl-progress-bar"
                  style={{ width: `${progress}%` }}
                />
                <span className="zl-progress-label">{progress}%</span>
              </div>
            ) : null}
          </div>
          <div className="zl-row-thumb">
            <img
              src={thumb}
              alt=""
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  '/assets/imgs/logo-zenleader.png';
              }}
            />
          </div>
        </div>
      </Link>
    </article>
  );
}
