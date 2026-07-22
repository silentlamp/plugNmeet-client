import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import {
  fetchMeetingToken,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { ZenBlockLoader } from '../../components/extra-pages/ZenBreathingLoader';
import { ZENLEADER_ROOM_CODE_RE } from '../../helpers/utils';

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
      <div className="zl-join-page">
        <div className="zl-join-card">
          <h1>Could not join meeting</h1>
          <p>{error}</p>
          <p className="zl-join-code">
            Room code: <code>{roomCode || '—'}</code>
          </p>
          <Link to="/my-courses" className="zl-btn zl-btn-primary">
            Back to my courses
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="zl-join-page">
      <div className="zl-join-card zl-join-card--loading">
        <ZenBlockLoader size={40} label="Joining meeting" />
        <h1>Joining meeting…</h1>
        <p>
          Preparing your session for <code>{roomCode}</code>
        </p>
      </div>
    </div>
  );
}
