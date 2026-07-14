import { useState } from 'react';

import type { EventResponse } from '../api/types';
import {
  eventAuthorName,
  extractRoomCode,
  formatEventTime,
  formatStartLabel,
} from '../utils/eventHelpers';

type EventCardVariant = 'live' | 'upcoming' | 'ended' | 'draft';

type EventCardProps = {
  event: EventResponse;
  variant: EventCardVariant;
  joiningCode: string | null;
  onJoin: (roomCode: string) => void;
  /** Secondary hint under the author name (defaults by variant). */
  relationHint?: string;
};

/**
 * Compact Dojo-style horizontal event row for the meet hub.
 *
 * @param event - event payload
 * @param variant - live | upcoming | ended | draft
 * @param joiningCode - room code currently joining, if any
 * @param onJoin - join handler
 * @param relationHint - optional author-line hint (saved vs created)
 */
export function EventCard({
  event,
  variant,
  joiningCode,
  onJoin,
  relationHint,
}: EventCardProps) {
  const roomCode = extractRoomCode(event);
  const busy = joiningCode === roomCode && Boolean(roomCode);
  const thumb = event.thumbnailUrl || '/assets/imgs/logo-zenleader.png';
  const author = eventAuthorName(event);
  const canJoin = variant === 'live' && Boolean(roomCode);
  const [copied, setCopied] = useState(false);
  const hint =
    relationHint ||
    (variant === 'draft' ? 'Created by you · draft' : 'Saved · interested');

  const timeLabel =
    variant === 'ended'
      ? `Ended · ${formatEventTime(event.endTime || event.startTime)}`
      : variant === 'live'
        ? `Live · until ${formatEventTime(event.endTime)}`
        : variant === 'draft'
          ? formatStartLabel(event.startTime) || 'Draft — not published yet'
          : formatStartLabel(event.startTime);

  const copyRoomCode = async () => {
    if (!roomCode) {
      return;
    }
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore clipboard failures
    }
  };

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
              <span className="zl-author-hint">{hint}</span>
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
          {variant === 'draft' ? (
            <span className="zl-chip zl-chip-draft">Draft</span>
          ) : null}
        </div>

        <div className="zl-row-body">
          <div className="zl-row-copy">
            <h3 className="zl-card-title">{event.title || 'Event'}</h3>
            {event.description ? (
              <p className="zl-card-desc">{event.description}</p>
            ) : null}
            {timeLabel ? <p className="zl-card-time">{timeLabel}</p> : null}
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
