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

  return (
    <article className="zl-row">
      <Link
        className="zl-row-main zl-row-link"
        to={`/my-courses/${enrollment.courseRunId}`}
      >
        <div className="zl-row-body">
          <div className="zl-row-copy">
            <h3 className="zl-card-title">{title}</h3>
            <p className="zl-card-time">
              Run {courseRun.code || enrollment.courseRunCode || '—'}
              {enrollment.status ? ` · ${enrollment.status}` : ''}
            </p>
            {progress !== null ? (
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
