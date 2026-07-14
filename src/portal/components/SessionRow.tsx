import { useState } from 'react';

import type { CourseSessionResponse } from '../api/types';
import { canJoinSession, formatSessionTime } from '../utils/sessionHelpers';

type SessionRowProps = {
  session: CourseSessionResponse;
  variant: 'live' | 'upcoming' | 'ended';
  joiningId: string | null;
  onJoin: (session: CourseSessionResponse) => void;
  /** When true, show Host live and allow starting upcoming rooms. */
  isInstructor?: boolean;
};

/**
 * Compact LMS session row with optional Join / Host live action.
 *
 * @param session - course session
 * @param variant - live | upcoming | ended
 * @param joiningId - session id currently joining
 * @param onJoin - join handler
 * @param isInstructor - assigned course-run instructor
 */
export function SessionRow({
  session,
  variant,
  joiningId,
  onJoin,
  isInstructor = false,
}: SessionRowProps) {
  const busy = joiningId === session.id;
  const roomCode = session.meetingRoomId?.trim() || '';
  const canStart =
    Boolean(roomCode) &&
    (variant === 'live' || (isInstructor && variant === 'upcoming'));
  const duration = session.durationMinutes
    ? `${session.durationMinutes} min`
    : '';
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    if (!roomCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  };

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
            {roomCode ? (
              <div className="zl-room-code-row">
                <span className="zl-room-code-label">Room code</span>
                <code className="zl-room-code">{roomCode}</code>
                <button
                  type="button"
                  className="zl-btn zl-btn-ghost zl-btn-xs"
                  onClick={() => void copyRoomCode()}
                >
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : !canJoinSession(session) && variant !== 'ended' ? (
              <p className="zl-card-time">Room not ready yet</p>
            ) : null}
            {isInstructor && variant === 'upcoming' && roomCode ? (
              <p className="zl-card-time">
                As instructor you can open the room early for learners.
              </p>
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

        {canStart ? (
          <div className="zl-row-actions">
            <button
              type="button"
              className="zl-btn zl-btn-accent zl-btn-sm"
              disabled={joiningId !== null}
              onClick={() => onJoin(session)}
            >
              {busy
                ? isInstructor
                  ? 'Opening…'
                  : 'Joining…'
                : isInstructor
                  ? 'Host live'
                  : 'Join live'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
