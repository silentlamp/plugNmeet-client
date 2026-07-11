import type { EventResponse } from '../api/types';
import {
  eventAuthorName,
  extractRoomCode,
  formatEventTime,
  formatStartLabel,
} from '../utils/eventHelpers';

type EventCardVariant = 'live' | 'upcoming' | 'ended';

type EventCardProps = {
  event: EventResponse;
  variant: EventCardVariant;
  joiningCode: string | null;
  onJoin: (roomCode: string) => void;
};

/**
 * Compact Dojo-style horizontal event row for the meet hub.
 *
 * @param event - interested event
 * @param variant - live | upcoming | ended
 * @param joiningCode - room code currently joining, if any
 * @param onJoin - join handler
 */
export function EventCard({
  event,
  variant,
  joiningCode,
  onJoin,
}: EventCardProps) {
  const roomCode = extractRoomCode(event);
  const busy = joiningCode === roomCode && Boolean(roomCode);
  const thumb = event.thumbnailUrl || '/assets/imgs/logo-zenleader.png';
  const author = eventAuthorName(event);
  const canJoin = variant === 'live' && Boolean(roomCode);

  const timeLabel =
    variant === 'ended'
      ? `Ended · ${formatEventTime(event.endTime || event.startTime)}`
      : variant === 'live'
        ? `Live · until ${formatEventTime(event.endTime)}`
        : formatStartLabel(event.startTime);

  return (
    <article
      className={`zl-row zl-row-${variant}${variant === 'live' ? ' zl-row-live' : ''}`}
    >
      <div className="zl-row-main">
        <div className="zl-row-top">
          <div className="zl-row-author">
            {event.author?.avatarUrl ? (
              <img
                className="zl-avatar"
                src={event.author.avatarUrl}
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span className="zl-avatar zl-avatar-fallback" aria-hidden>
                {author.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="zl-row-author-text">
              <span className="zl-author-name">{author}</span>
              <span className="zl-author-hint">Saved · interested</span>
            </div>
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
            <h3 className="zl-card-title">{event.title || 'Event'}</h3>
            {event.description ? (
              <p className="zl-card-desc">{event.description}</p>
            ) : null}
            {timeLabel ? <p className="zl-card-time">{timeLabel}</p> : null}
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

        {variant === 'live' ? (
          <div className="zl-row-actions">
            <button
              type="button"
              className="zl-btn zl-btn-accent zl-btn-sm"
              disabled={!canJoin || joiningCode !== null}
              title={roomCode ? undefined : 'This event has no room yet'}
              onClick={() => onJoin(roomCode)}
            >
              {busy ? 'Joining…' : 'Join live'}
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
