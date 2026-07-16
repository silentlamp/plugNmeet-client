import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  fetchMeetingToken,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { ZenBreathingLoader } from '../../components/extra-pages/ZenBreathingLoader';
import { ZENLEADER_ROOM_CODE_RE } from '../../helpers/utils';
import { Button } from '@/portal/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';

/**
 * Auth-gated page that exchanges a room code for a meet token and redirects
 * into the meeting SPA with `?access_token=`.
 * Room codes come from Java MeetRoomCodes (`xxx-xxxx-xxx`).
 */
export function JoinMeetingPage() {
  const { roomCode: rawCode } = useParams<{ roomCode: string }>();
  const roomCode = (rawCode ?? '').trim().toLowerCase();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ZENLEADER_ROOM_CODE_RE.test(roomCode)) {
      setError('Invalid meeting link. Check the room code and try again.');
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const token = await fetchMeetingToken(roomCode);
        if (cancelled) {
          return;
        }
        redirectToMeeting(token);
      } catch (err) {
        if (cancelled) {
          return;
        }
        if (err instanceof ZenApiError) {
          setError(err.message || 'Unable to join this meeting.');
        } else {
          setError(
            err instanceof Error ? err.message : 'Unable to join this meeting.',
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [roomCode]);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Could not join meeting</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Room code:{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {roomCode || '—'}
              </code>
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild>
              <Link to="/my-courses">Back to my courses</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <Card className="w-full max-w-md items-center py-10 text-center">
        <CardHeader className="items-center">
          <ZenBreathingLoader size={64} label="Joining meeting" />
          <CardTitle className="mt-4">Joining meeting…</CardTitle>
          <CardDescription>
            Preparing your session for{' '}
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {roomCode}
            </code>
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}
