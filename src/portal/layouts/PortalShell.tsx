import { FormEvent, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Video } from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

import { getZenEmail } from '../auth/session';
import {
  createInstantMeeting,
  fetchMeetingToken,
  logout,
  redirectToMeeting,
  ZenApiError,
} from '../api/zenleaderApi';
import { PortalSidebar } from '../components/PortalSidebar';

type MeetDialogMode = 'join' | 'create';

/**
 * Authenticated portal chrome: shadcn Sidebar + main outlet.
 *
 * Meet (join / instant meeting) is a global action available from the sidebar
 * and the mobile header.
 */
export function PortalShell() {
  const [meetOpen, setMeetOpen] = useState(false);
  const [meetMode, setMeetMode] = useState<MeetDialogMode>('join');
  const [meetError, setMeetError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [createdRoomCode, setCreatedRoomCode] = useState<string | null>(null);
  const navigate = useNavigate();
  const email = getZenEmail();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  /**
   * Opens the meet dialog (join / create).
   */
  const openMeetDialog = (mode: MeetDialogMode = 'join') => {
    setMeetError(null);
    setCreatedRoomCode(null);
    setMeetMode(mode);
    setMeetOpen(true);
  };

  /**
   * Handles 401 by signing out; otherwise surfaces the error message.
   */
  const handleAuthAwareError = async (err: unknown, fallback: string) => {
    if (err instanceof ZenApiError && err.status === 401) {
      await logout();
      navigate('/login', { replace: true });
      return;
    }
    setMeetError(err instanceof Error ? err.message : fallback);
    setBusy(false);
  };

  /**
   * Requests a meeting token for the room code and redirects to Meet.
   *
   * @param roomCode - PlugNMeet room code from the dialog form
   */
  const handleJoin = async (roomCode: string) => {
    setMeetError(null);
    setBusy(true);
    try {
      const token = await fetchMeetingToken(roomCode);
      redirectToMeeting(token);
    } catch (err) {
      await handleAuthAwareError(err, 'Unable to join room');
    }
  };

  /**
   * Creates an instant unlinked meeting for the signed-in host and redirects as host.
   *
   * @param title - optional meeting title
   */
  const handleCreateInstant = async (title: string) => {
    setMeetError(null);
    setCreatedRoomCode(null);
    setBusy(true);
    try {
      const result = await createInstantMeeting({
        title: title.trim() || undefined,
      });
      if (result.roomCode) {
        setCreatedRoomCode(result.roomCode);
      }
      redirectToMeeting(result.token);
    } catch (err) {
      await handleAuthAwareError(err, 'Unable to create meeting');
    }
  };

  return (
    <SidebarProvider>
      <PortalSidebar
        email={email}
        onMeet={() => openMeetDialog('join')}
        onLogout={() => void handleLogout()}
      />
      <SidebarInset className="zl-portal-inset">
        <header className="bg-background sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 border-b px-3 md:px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <strong className="truncate text-sm">ZenLeader</strong>
            <span className="text-muted-foreground truncate text-xs">
              Portal
            </span>
          </div>
          <Button size="sm" onClick={() => openMeetDialog('join')}>
            <Video className="size-4" />
            Meet
          </Button>
        </header>
        <div className="zl-portal-content">
          <Outlet />
        </div>
      </SidebarInset>

      <Dialog
        open={meetOpen}
        onOpenChange={(open) => {
          if (busy && !open) {
            return;
          }
          setMeetOpen(open);
          if (!open) {
            setMeetError(null);
            setCreatedRoomCode(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md" showCloseButton={!busy}>
          <DialogHeader>
            <DialogTitle>Meet</DialogTitle>
            <DialogDescription>
              Join with a room code or start a new meeting
            </DialogDescription>
          </DialogHeader>

          <Tabs
            value={meetMode}
            onValueChange={(value) => {
              if (busy) {
                return;
              }
              setMeetMode(value as MeetDialogMode);
              setMeetError(null);
              setCreatedRoomCode(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="join" disabled={busy}>
                Join with code
              </TabsTrigger>
              <TabsTrigger value="create" disabled={busy}>
                New meeting
              </TabsTrigger>
            </TabsList>
            <TabsContent value="join" className="mt-4">
              <JoinRoomForm
                onJoin={(code) => void handleJoin(code)}
                joining={busy}
                error={meetError}
              />
            </TabsContent>
            <TabsContent value="create" className="mt-4">
              <CreateMeetingForm
                onCreate={(title) => void handleCreateInstant(title)}
                creating={busy}
                error={meetError}
                createdRoomCode={createdRoomCode}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

/**
 * Compact join-by-code form used in the Meet dialog.
 *
 * @param onJoin - submit handler with room code
 * @param joining - whether a join request is in flight
 * @param error - optional error message
 */
export function JoinRoomForm({
  onJoin,
  joining,
  error,
}: {
  onJoin: (roomCode: string) => void;
  joining: boolean;
  error?: string | null;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const roomCode = String(form.get('roomCode') ?? '').trim();
    onJoin(roomCode);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Enter the room code from an event or course session (for example{' '}
        <code className="bg-muted rounded px-1 py-0.5 text-xs">
          abc-defg-hij
        </code>
        ).
      </p>
      <div className="grid gap-2">
        <Label htmlFor="roomCode">Room code</Label>
        <Input
          id="roomCode"
          name="roomCode"
          type="text"
          required
          placeholder="xxx-xxxx-xxx"
          autoComplete="off"
          autoFocus
          disabled={joining}
        />
      </div>
      <Button type="submit" className="w-full" disabled={joining}>
        {joining ? 'Joining…' : 'Join meeting'}
      </Button>
    </form>
  );
}

/**
 * Instant meeting form — creates a host-owned room (no event link) like Google Meet.
 *
 * @param onCreate - submit handler with optional title
 * @param creating - whether create is in flight
 * @param error - optional error message
 * @param createdRoomCode - room code shown briefly before redirect
 */
export function CreateMeetingForm({
  onCreate,
  creating,
  error,
  createdRoomCode,
}: {
  onCreate: (title: string) => void;
  creating: boolean;
  error?: string | null;
  createdRoomCode?: string | null;
}) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    onCreate(title);
  };

  return (
    <form className="grid gap-4" onSubmit={handleSubmit}>
      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      {createdRoomCode ? (
        <Alert>
          <AlertDescription>
            Room code: <strong>{createdRoomCode}</strong> — opening meet…
          </AlertDescription>
        </Alert>
      ) : null}
      <p className="text-muted-foreground text-sm">
        Start a meeting that is not linked to an event. You become the host;
        guests who join with your room code wait in the waiting room until you
        approve them.
      </p>
      <div className="grid gap-2">
        <Label htmlFor="meetingTitle">Meeting title (optional)</Label>
        <Input
          id="meetingTitle"
          name="title"
          type="text"
          placeholder="Quick sync"
          autoComplete="off"
          autoFocus
          disabled={creating}
        />
      </div>
      <Button type="submit" className="w-full" disabled={creating}>
        {creating ? 'Starting…' : 'Start meeting'}
      </Button>
    </form>
  );
}
