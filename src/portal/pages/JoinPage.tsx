import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  fetchMeetingToken,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { JoinRoomForm } from '../layouts/PortalShell';

/**
 * Join a PlugNMeet room by code (redirects to meet subdomain).
 */
export function JoinPage() {
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (roomCode: string) => {
    setError(null);
    setJoining(true);
    try {
      const token = await fetchMeetingToken(roomCode);
      redirectToMeeting(token);
    } catch (err) {
      if (err instanceof ZenApiError && err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to join room');
      setJoining(false);
    }
  };

  return (
    <>
      <div className="zl-page-head">
        <div>
          <h1>Join room</h1>
          <p>Enter a room code to join a live meeting</p>
        </div>
      </div>
      <div className="zl-panel zl-panel-inline">
        <JoinRoomForm
          onJoin={(code) => void handleJoin(code)}
          joining={joining}
          error={error}
        />
      </div>
    </>
  );
}
