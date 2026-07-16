import { useState } from 'react';

import type { CourseSessionResponse } from '../api/types';
import { canJoinSession, formatSessionTime } from '../utils/sessionHelpers';
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

type SessionRowProps = {
  session: CourseSessionResponse;
  variant: 'live' | 'upcoming' | 'ended';
  joiningId: string | null;
  onJoin: (session: CourseSessionResponse) => void;
  /** When true, show Host live and allow starting upcoming rooms. */
  isInstructor?: boolean;
};

/**
 * LMS session card with optional Join / Host live action (shadcn).
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
    <Card
      className={
        variant === 'live'
          ? 'gap-4 border-primary/40 py-4 shadow-sm'
          : 'gap-4 py-4 shadow-sm'
      }
    >
      <CardHeader className="gap-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium">
              {session.sessionNumber != null
                ? `Session ${session.sessionNumber}`
                : 'Session'}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatSessionTime(session.scheduledAt)}
              {duration ? ` · ${duration}` : ''}
            </p>
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
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4">
        <CardTitle className="text-base leading-snug">
          {session.title || 'Live session'}
        </CardTitle>
        {session.description ? (
          <CardDescription className="line-clamp-2">
            {session.description}
          </CardDescription>
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
        ) : !canJoinSession(session) && variant !== 'ended' ? (
          <p className="text-xs text-muted-foreground">Room not ready yet</p>
        ) : null}
        {isInstructor && variant === 'upcoming' && roomCode ? (
          <p className="text-xs text-muted-foreground">
            As instructor you can open the room early for learners.
          </p>
        ) : null}
        {variant === 'ended' && session.recordingUrl ? (
          <a
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            href={session.recordingUrl}
            target="_blank"
            rel="noreferrer"
          >
            Open recording
          </a>
        ) : null}
      </CardContent>

      {canStart ? (
        <CardFooter className="px-4 pt-0">
          <Button
            type="button"
            size="sm"
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
          </Button>
        </CardFooter>
      ) : null}
    </Card>
  );
}
