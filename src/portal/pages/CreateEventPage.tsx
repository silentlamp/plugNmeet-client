import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  createEvent,
  logout,
  uploadViaPresigned,
  ZenApiError,
} from '../api/zenleaderApi';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

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
 * Portal page to create a ZenLeader event (cover image + auto room code).
 */
export function CreateEventPage() {
  const navigate = useNavigate();
  const defaults = useMemo(() => defaultScheduleInputs(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState(defaults.start);
  const [endTime, setEndTime] = useState(defaults.end);
  const [publishImmediately, setPublishImmediately] = useState(true);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!thumbnailFile) {
      setThumbnailPreview(null);
      return;
    }
    const url = URL.createObjectURL(thumbnailFile);
    setThumbnailPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [thumbnailFile]);

  const clearThumbnail = () => {
    setThumbnailFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onPickThumbnail = (file: File | undefined) => {
    setError(null);
    if (!file) {
      return;
    }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError('Please choose a JPG, PNG, WebP, or GIF image.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError('Image must be 5 MB or smaller.');
      return;
    }
    setThumbnailFile(file);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const startMs = Date.parse(startTime);
    const endMs = Date.parse(endTime);
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      setError('Please choose a valid start and end time.');
      return;
    }
    if (endMs <= startMs) {
      setError('End time must be after start time.');
      return;
    }

    setSaving(true);
    try {
      let thumbnailUrl: string | undefined;
      if (thumbnailFile) {
        const uploaded = await uploadViaPresigned(thumbnailFile);
        thumbnailUrl = uploaded.downloadUrl;
      }
      const created = await createEvent({
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnailUrl,
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

        <div className="zl-field">
          <label htmlFor="event-thumbnail">Cover image</label>
          <input
            ref={fileInputRef}
            id="event-thumbnail"
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(',')}
            className="zl-file-input"
            disabled={saving}
            onChange={(e) => onPickThumbnail(e.target.files?.[0])}
          />
          <p className="zl-form-hint zl-form-hint-tight">
            Optional. JPG, PNG, WebP, or GIF · max 5 MB
          </p>
          {thumbnailPreview ? (
            <div className="zl-thumb-preview">
              <img src={thumbnailPreview} alt="Cover preview" />
              <div className="zl-thumb-preview-actions">
                <button
                  type="button"
                  className="zl-btn zl-btn-ghost zl-btn-xs"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </button>
                <button
                  type="button"
                  className="zl-btn zl-btn-ghost zl-btn-xs"
                  disabled={saving}
                  onClick={clearThumbnail}
                >
                  Remove
                </button>
              </div>
            </div>
          ) : null}
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
            {saving
              ? thumbnailFile
                ? 'Uploading…'
                : 'Creating…'
              : 'Create event'}
          </button>
        </div>
      </form>
    </>
  );
}
