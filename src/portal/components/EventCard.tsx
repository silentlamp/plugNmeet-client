import { useState } from 'react';

import type { EventResponse } from '../api/types';
import {
  eventAuthorName,
  extractRoomCode,
  formatEventTime,
  formatStartLabel,
} from '../utils/eventHelpers';
import { Badge } from '@/portal/components/ui/badge';
import { Button } from '@/portal/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';

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
 * Event row card for Saved / My events hubs (shadcn Card + Badge + Button).
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
  const thumb = event.thumbnailUrl || '/assets/imgs/logo-zenleader.png';
  const author = eventAuthorName(event);
  const canJoin = variant === 'live' && Boolean(roomCode);
  const [copied, setCopied] = useState(false);
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
          ? 'gap-4 border-primary/40 py-4 shadow-sm'
          : 'gap-4 py-4 shadow-sm'
      }
    >
      <CardHeader className="gap-3 px-4 [.border-b]:pb-0">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {event.author?.avatarUrl ? (
              <img
                className="size-9 shrink-0 rounded-full object-cover"
                src={event.author.avatarUrl}
                alt=""
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-secondary-foreground"
                aria-hidden
              >
                {author.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{author}</p>
              <p className="truncate text-xs text-muted-foreground">{hint}</p>
            </div>
          </div>
          {variant === 'live' ? (
            <Badge className="shrink-0 gap-1.5 bg-destructive text-white hover:bg-destructive">
              <span className="size-1.5 animate-pulse rounded-full bg-white" />
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
        </div>
      </CardHeader>

      <CardContent className="flex gap-4 px-4">
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
            <p className="text-xs text-muted-foreground">{timeLabel}</p>
          ) : null}
          {roomCode ? (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground">Room code</span>
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
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
        <div className="size-20 shrink-0 overflow-hidden rounded-md border bg-muted sm:size-24">
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

      {variant === 'live' ? (
        <CardFooter className="px-4 pt-0">
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
