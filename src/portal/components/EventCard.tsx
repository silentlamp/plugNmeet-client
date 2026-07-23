import { useEffect, useState } from 'react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

import type { EventResponse } from '../api/types';
import {
  eventAuthorName,
  extractRoomCode,
  formatEventTime,
  formatStartLabel,
} from '../utils/eventHelpers';

const FALLBACK_THUMB = '/assets/imgs/logo-zenleader.png';

type EventCardVariant = 'live' | 'upcoming' | 'ended' | 'draft';

type EventCardProps = {
  event: EventResponse;
  variant: EventCardVariant;
  joiningCode: string | null;
  onJoin: (roomCode: string) => void;
  /** Secondary hint under the author name (defaults by variant). */
  relationHint?: string;
  /** Hide redundant "Created by you" style hints on the My events hub. */
  compactMeta?: boolean;
};

/**
 * Compact event card for the meet hub, built with shadcn Card / Badge / Button.
 *
 * Uses `event.thumbnailUrl` when present; falls back to the ZenLeader logo.
 *
 * @param event - event payload
 * @param variant - live | upcoming | ended | draft
 * @param joiningCode - room code currently joining, if any
 * @param onJoin - join handler
 * @param relationHint - optional author-line hint (saved vs created)
 * @param compactMeta - hide redundant creator hints on My events
 */
export function EventCard({
  event,
  variant,
  joiningCode,
  onJoin,
  relationHint,
  compactMeta = false,
}: EventCardProps) {
  const roomCode = extractRoomCode(event);
  const busy = joiningCode === roomCode && Boolean(roomCode);
  const thumbnailUrl = String(event.thumbnailUrl || '').trim();
  const hasThumbnail = Boolean(thumbnailUrl);
  const [thumbSrc, setThumbSrc] = useState(
    () => thumbnailUrl || FALLBACK_THUMB,
  );
  const author = eventAuthorName(event);
  const canJoin = variant === 'live' && Boolean(roomCode);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setThumbSrc(thumbnailUrl || FALLBACK_THUMB);
  }, [thumbnailUrl]);

  const hint =
    relationHint ||
    (compactMeta
      ? variant === 'draft'
        ? 'Draft — not published'
        : variant === 'live'
          ? 'Hosting now'
          : variant === 'ended'
            ? 'Hosted by you'
            : 'Published'
      : variant === 'draft'
        ? 'Created by you · draft'
        : 'Saved · interested');

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
    <Card
      className={
        variant === 'live'
          ? 'border-primary/40 shadow-sm ring-1 ring-primary/15'
          : undefined
      }
    >
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar size="sm">
            {event.author?.avatarUrl ? (
              <AvatarImage src={event.author.avatarUrl} alt="" />
            ) : null}
            <AvatarFallback>{author.slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{author}</p>
            <p className="text-muted-foreground truncate text-xs">{hint}</p>
          </div>
        </div>
        {variant === 'live' ? (
          <Badge className="gap-1.5 shrink-0">
            <span
              className="size-1.5 animate-pulse rounded-full bg-current"
              aria-hidden
            />
            LIVE
          </Badge>
        ) : null}
        {variant === 'upcoming' ? (
          <Badge variant="secondary" className="shrink-0">
            Upcoming
          </Badge>
        ) : null}
        {variant === 'ended' ? (
          <Badge variant="outline" className="shrink-0">
            Ended
          </Badge>
        ) : null}
        {variant === 'draft' ? (
          <Badge variant="outline" className="shrink-0">
            Draft
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="flex gap-4 pt-0">
        <div className="min-w-0 flex-1 space-y-2">
          <CardTitle className="text-base leading-snug">
            {event.title || 'Event'}
          </CardTitle>
          {event.description ? (
            <CardDescription className="line-clamp-2">
              {event.description}
            </CardDescription>
          ) : null}
          {timeLabel ? (
            <p className="text-muted-foreground text-xs">{timeLabel}</p>
          ) : null}
          {roomCode ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-muted-foreground text-xs">Room code</span>
              <code className="bg-muted rounded px-1.5 py-0.5 text-xs">
                {roomCode}
              </code>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={() => void copyRoomCode()}
              >
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          ) : null}
        </div>
        <div
          className={`bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg sm:size-24 ${
            hasThumbnail && thumbSrc === thumbnailUrl ? '' : 'p-3'
          }`}
        >
          <img
            src={thumbSrc}
            alt={hasThumbnail ? event.title || 'Event cover' : ''}
            className={
              hasThumbnail && thumbSrc === thumbnailUrl
                ? 'size-full object-cover'
                : 'size-full object-contain opacity-80'
            }
            onError={() => setThumbSrc(FALLBACK_THUMB)}
          />
        </div>
      </CardContent>

      {variant === 'live' ? (
        <CardFooter className="pt-0">
          <Button
            type="button"
            size="sm"
            disabled={!canJoin || joiningCode !== null}
            title={roomCode ? undefined : 'This event has no room yet'}
            onClick={() => onJoin(roomCode)}
          >
            {busy ? 'Joining…' : 'Join live'}
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
