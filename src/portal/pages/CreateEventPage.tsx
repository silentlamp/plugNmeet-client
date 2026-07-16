import { FormEvent, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ImagePlus, Loader2, X } from 'lucide-react';

import {
  createEvent,
  logout,
  uploadViaPresigned,
  ZenApiError,
} from '../api/zenleaderApi';
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Button } from '@/portal/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';
import { Checkbox } from '@/portal/components/ui/checkbox';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Textarea } from '@/portal/components/ui/textarea';

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
 * Portal page to create a ZenLeader event (thumbnail + auto room code + live session).
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

  const clearThumbnail = () => {
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(null);
    setThumbnailPreview(null);
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
    if (thumbnailPreview) {
      URL.revokeObjectURL(thumbnailPreview);
    }
    setThumbnailFile(file);
    setThumbnailPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
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
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div>
        <Button variant="ghost" size="sm" className="mb-2 -ml-2 px-2" asChild>
          <Link to="/my-events">← My events</Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Create event
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Schedule a public event with an auto-generated meet room code
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <form onSubmit={(e) => void handleSubmit(e)}>
          <CardHeader>
            <CardTitle>Event details</CardTitle>
            <CardDescription>
              A meet room code is generated automatically. Public events do not
              use a waiting room — anyone with the code can join once the host
              starts the room.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="event-title">Title</Label>
              <Input
                id="event-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                maxLength={200}
                placeholder="Event title"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-description">Description</Label>
              <Textarea
                id="event-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Optional details"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <Label>Cover image</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="sr-only"
                disabled={saving}
                onChange={(e) => onPickThumbnail(e.target.files?.[0])}
              />
              {thumbnailPreview ? (
                <div className="relative overflow-hidden rounded-lg border bg-muted">
                  <img
                    src={thumbnailPreview}
                    alt="Event cover preview"
                    className="aspect-[16/9] w-full object-cover"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon-sm"
                    className="absolute top-2 right-2"
                    disabled={saving}
                    aria-label="Remove cover image"
                    onClick={clearThumbnail}
                  >
                    <X />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/40 px-4 py-10 text-sm text-muted-foreground transition-colors hover:bg-muted/70 disabled:opacity-50"
                >
                  <ImagePlus className="size-8 opacity-70" />
                  <span className="font-medium text-foreground">
                    Upload cover image
                  </span>
                  <span>JPG, PNG, WebP, or GIF · max 5 MB</span>
                </button>
              )}
              {thumbnailPreview ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={saving}
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change image
                </Button>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="event-start">Starts</Label>
                <Input
                  id="event-start"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end">Ends</Label>
                <Input
                  id="event-end"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  disabled={saving}
                />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-3">
              <Checkbox
                id="event-publish"
                checked={publishImmediately}
                onCheckedChange={(checked) =>
                  setPublishImmediately(checked === true)
                }
                disabled={saving}
              />
              <div className="space-y-1">
                <Label htmlFor="event-publish" className="cursor-pointer">
                  Publish immediately
                </Label>
                <p className="text-xs text-muted-foreground">
                  Visible in public feeds when checked. Uncheck to keep as a
                  draft.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 border-t pt-6">
            <Button
              type="button"
              variant="ghost"
              disabled={saving}
              onClick={() => navigate('/my-events')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !title.trim()}>
              {saving ? (
                <>
                  <Loader2 className="animate-spin" />
                  Creating…
                </>
              ) : (
                'Create event'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
