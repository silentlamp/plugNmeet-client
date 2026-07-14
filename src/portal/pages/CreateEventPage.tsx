import { FormEvent, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { createEvent, logout, ZenApiError } from '../api/zenleaderApi';

/**
 * Builds an ISO datetime string from a datetime-local input value (local → UTC).
 *
 * @param value - `YYYY-MM-DDTHH:mm` from datetime-local
 */
function toIsoFromLocalInput(value: string): string {
  return new Date(value).toISOString();
}

/**
 * Default start = now + 30m, end = start + 1h, formatted for datetime-local.
 */
function defaultScheduleInputs(): { start: string; end: string } {
  const start = new Date(Date.now() + 30 * 60_000);
  const end = new Date(start.getTime() + 60 * 60_000);
  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  return { start: toLocal(start), end: toLocal(end) };
}

/**
 * Portal page to create a ZenLeader event (auto room code + live session).
 */
export function CreateEventPage() {
  const navigate = useNavigate();
  const defaults = useMemo(() => defaultScheduleInputs(), []);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(defaults.start);
  const [endTime, setEndTime] = useState(defaults.end);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: toIsoFromLocalInput(startTime),
        endTime: toIsoFromLocalInput(endTime),
        publishImmediately,
      });
      navigate('/my-events', {
        replace: true,
        state: { createdRoomCode: created.roomCode || null },
      });
    } catch (err) {
      if (err instanceof ZenApiError && err.status === 401) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : 'Unable to create event');
      setSaving(false);
    }
  };

  return (
    <>
      <div className="zl-page-head">
        <div>
          <Link className="zl-back-link" to="/my-events">
            ← My events
          </Link>
          <h1>Create event</h1>
          <p>Schedule a public event with an auto-generated meet room code</p>
        </div>
      </div>

      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}

      <form
        className="zl-panel zl-create-event"
        onSubmit={(e) => void handleSubmit(e)}
      >
        <div className="zl-field">
          <label htmlFor="event-title">Title</label>
          <input
            id="event-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            placeholder="Event title"
            disabled={saving}
          />
        </div>
        <div className="zl-field">
          <label htmlFor="event-description">Description</label>
          <textarea
            id="event-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            placeholder="Optional details"
            disabled={saving}
          />
        </div>
        <div className="zl-field-grid">
          <div className="zl-field">
            <label htmlFor="event-start">Starts</label>
            <input
              id="event-start"
              type="datetime-local"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
              disabled={saving}
            />
          </div>
          <div className="zl-field">
            <label htmlFor="event-end">Ends</label>
            <input
              id="event-end"
              type="datetime-local"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
              disabled={saving}
            />
          </div>
        </div>
        <label className="zl-check-row">
          <input
            type="checkbox"
            checked={publishImmediately}
            onChange={(e) => setPublishImmediately(e.target.checked)}
            disabled={saving}
          />
          <span>Publish immediately (visible in feeds)</span>
        </label>
        <p className="zl-form-hint">
          A meet room code is generated automatically. Public events do not use
          a waiting room — anyone with the code can join once the host starts
          the room.
        </p>
        <div className="zl-form-actions">
          <button
            type="button"
            className="zl-btn zl-btn-ghost"
            disabled={saving}
            onClick={() => navigate('/my-events')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="zl-btn zl-btn-accent"
            disabled={saving || !title.trim()}
          >
            {saving ? 'Creating…' : 'Create event'}
          </button>
        </div>
      </form>
    </>
  );
}
