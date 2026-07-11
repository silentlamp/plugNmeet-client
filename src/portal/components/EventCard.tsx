import type { EventResponse } from '../api/types';
import {
  eventAuthorName,
  extractRoomCode,
  formatEventRange,
  formatEventTime,
} from '../utils/eventHelpers';

type EventCardVariant = 'live' | 'upcoming' | 'ended';

type EventCardProps = {
  event: EventResponse;
  variant: EventCardVariant;
  joiningCode: string | null;
  onJoin: (roomCode: string) => void;
};

/**
 * Production event card for the meet hub (Dojo-aligned fields).
 *
 * @param event - interested event
 * @param variant - live | upcoming | ended presentation
 * @param joiningCode - room code currently joining, if any
 * @param onJoin - join handler with room code
 */
export function EventCard({
  event,
  variant,
  joiningCode,
  onJoin,
}: EventCardProps) {
  const roomCode = extractRoomCode(event);
  const busy = joiningCode === roomCode && Boolean(roomCode);
  const thumb = event.thumbnailUrl || './assets/imgs/logo-zenleader.png';
  const author = eventAuthorName(event);
  const canJoin = variant !== 'ended' && Boolean(roomCode);

  return (
    <article
      className={`zl-card zl-card-${variant}${variant === 'live' ? ' zl-card-live' : ''}`}
    >
      <div className="zl-card-media">
        <img
          src={thumb}
          alt=""
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              './assets/imgs/logo-zenleader.png';
          }}
        />
        {variant === 'live' ? (
          <span className="zl-live-pill">
            <span className="zl-live-dot" aria-hidden />
            LIVE
          </span>
        ) : null}
      </div>

      <div className="zl-card-body">
        <div className="zl-card-author">
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
          <span className="zl-author-name">{author}</span>
          {variant === 'upcoming' ? (
            <span className="zl-chip zl-chip-upcoming">Upcoming</span>
          ) : null}
          {variant === 'ended' ? (
            <span className="zl-chip zl-chip-ended">Ended</span>
          ) : null}
        </div>

        <h3 className="zl-card-title">{event.title || 'Event'}</h3>

        {event.description ? (
          <p className="zl-card-desc">{event.description}</p>
        ) : null}

        <p className="zl-card-time">
          {variant === 'ended'
            ? `Ended ${formatEventTime(event.endTime || event.startTime)}`
            : formatEventRange(event.startTime, event.endTime)}
        </p>

        {variant === 'live' ? (
          <button
            type="button"
            className="zl-btn zl-btn-accent zl-btn-block"
            disabled={!canJoin || joiningCode !== null}
            title={roomCode ? undefined : 'This event has no room yet'}
            onClick={() => onJoin(roomCode)}
          >
            {busy ? 'Joining…' : 'Join live'}
          </button>
        ) : null}

        {variant === 'upcoming' ? (
          <button
            type="button"
            className="zl-btn zl-btn-accent zl-btn-block"
            disabled={!canJoin || joiningCode !== null}
            title={
              roomCode
                ? 'Join when the host has started the room'
                : 'Room not available yet'
            }
            onClick={() => onJoin(roomCode)}
          >
            {busy ? 'Joining…' : 'Join room'}
          </button>
        ) : null}
      </div>
    </article>
  );
}
