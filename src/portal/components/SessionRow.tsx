import type { CourseSessionResponse } from '../api/types';
import { canJoinSession, formatSessionTime } from '../utils/sessionHelpers';

type SessionRowProps = {
  session: CourseSessionResponse;
  variant: 'live' | 'upcoming' | 'ended';
  joiningId: string | null;
  onJoin: (session: CourseSessionResponse) => void;
};

/**
 * Compact LMS session row with optional Join live action.
 *
 * @param session - course session
 * @param variant - live | upcoming | ended
 * @param joiningId - session id currently joining
 * @param onJoin - join handler
 */
export function SessionRow({
  session,
  variant,
  joiningId,
  onJoin,
}: SessionRowProps) {
  const busy = joiningId === session.id;
  const canJoin = variant === 'live' && canJoinSession(session);
  const duration = session.durationMinutes
    ? `${session.durationMinutes} min`
    : '';

  return (
    <article className={`zl-row zl-row-${variant}`}>
      <div className="zl-row-main">
        <div className="zl-row-top">
          <div className="zl-row-author-text">
            <span className="zl-author-name">
              {session.sessionNumber != null
                ? `Session ${session.sessionNumber}`
                : 'Session'}
            </span>
            <span className="zl-author-hint">
              {formatSessionTime(session.scheduledAt)}
              {duration ? ` · ${duration}` : ''}
            </span>
          </div>
          {variant === 'live' ? (
            <span className="zl-live-pill">
              <span className="zl-live-dot" aria-hidden />
              LIVE
            </span>
          ) : null}
          {variant === 'upcoming' ? (
            <span className="zl-chip zl-chip-upcoming">Upcoming</span>
          ) : null}
          {variant === 'ended' ? (
            <span className="zl-chip zl-chip-ended">Ended</span>
          ) : null}
        </div>

        <div className="zl-row-body">
          <div className="zl-row-copy">
            <h3 className="zl-card-title">{session.title || 'Live session'}</h3>
            {session.description ? (
              <p className="zl-card-desc">{session.description}</p>
            ) : null}
            {!canJoinSession(session) && variant !== 'ended' ? (
              <p className="zl-card-time">Room not ready yet</p>
            ) : null}
            {variant === 'ended' && session.recordingUrl ? (
              <a
                className="zl-inline-link"
                href={session.recordingUrl}
                target="_blank"
                rel="noreferrer"
              >
                Open recording
              </a>
            ) : null}
          </div>
        </div>

        {variant === 'live' ? (
          <div className="zl-row-actions">
            <button
              type="button"
              className="zl-btn zl-btn-accent zl-btn-sm"
              disabled={!canJoin || joiningId !== null}
              onClick={() => onJoin(session)}
            >
              {busy ? 'Joining…' : 'Join live'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
