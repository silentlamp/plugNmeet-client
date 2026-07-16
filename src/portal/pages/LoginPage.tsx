import { FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import {
  loginWithApple,
  loginWithGoogle,
  loginWithPassword,
  ZenApiError,
} from '../api/zenleaderApi';
import { hasZenSession } from '../auth/session';
import {
  isAppleSignInConfigured,
  isGoogleSignInConfigured,
  requestAppleAuthPayload,
  requestGoogleIdToken,
} from '../auth/socialSignIn';
import { Alert, AlertDescription } from '@/portal/components/ui/alert';
import { Button } from '@/portal/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/portal/components/ui/card';
import { Input } from '@/portal/components/ui/input';
import { Label } from '@/portal/components/ui/label';
import { Separator } from '@/portal/components/ui/separator';

/**
 * ZenLeader sign-in form for the learner portal (password + Google/Apple).
 */
export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [socialBusy, setSocialBusy] = useState<'google' | 'apple' | null>(null);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const showGoogle = isGoogleSignInConfigured();
  const showApple = isAppleSignInConfigured();
  const busy = submitting || socialBusy !== null;

  if (hasZenSession()) {
    const next = params.get('next') || '/my-courses';
    return <Navigate to={next} replace />;
  }

  const goNext = () => {
    const next = params.get('next') || '/my-courses';
    navigate(next, { replace: true });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      goNext();
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setSocialBusy('google');
    try {
      const idToken = await requestGoogleIdToken();
      await loginWithGoogle(idToken);
      goNext();
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSocialBusy(null);
    }
  };

  const handleApple = async () => {
    setError(null);
    setSocialBusy('apple');
    try {
      const payload = await requestAppleAuthPayload();
      await loginWithApple(payload);
      goNext();
    } catch (err) {
      setError(resolveErrorMessage(err));
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <div className="zl-shell">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="items-center text-center">
          <img
            src="/assets/imgs/logo-zenleader.png"
            alt="ZenLeader"
            className="mb-2 size-14 object-contain"
          />
          <CardTitle className="text-xl">ZenLeader Meet</CardTitle>
          <CardDescription>
            Sign in to open your courses, live schedule, or join a room on the
            web.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {(showGoogle || showApple) && (
            <div className="space-y-3">
              {showGoogle ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void handleGoogle()}
                >
                  <GoogleMark />
                  {socialBusy === 'google'
                    ? 'Continuing with Google…'
                    : 'Continue with Google'}
                </Button>
              ) : null}
              {showApple ? (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => void handleApple()}
                >
                  <AppleMark />
                  {socialBusy === 'apple'
                    ? 'Continuing with Apple…'
                    : 'Continue with Apple'}
                </Button>
              ) : null}
              <div className="relative py-1">
                <Separator />
                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                  or
                </span>
              </div>
            </div>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => void handleSubmit(e)}
            autoComplete="on"
          >
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="username"
                placeholder="you@example.com"
                disabled={busy}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                disabled={busy}
              />
            </div>
            <Button className="w-full" type="submit" disabled={busy}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Maps unknown errors to a user-facing login message.
 *
 * @param err - caught error from password or social login
 */
function resolveErrorMessage(err: unknown): string {
  if (err instanceof ZenApiError) {
    return err.message;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Sign in failed';
}

/** Compact Google "G" mark for the social button. */
function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 48 48"
      aria-hidden
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.5-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 8 3l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.3 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-7.9l-6.5 5C9.6 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.4 5.6-6.1 7.1l.1.1 6.2 5.2C38.1 37.3 44 32 44 24c0-1.3-.1-2.5-.4-3.5z"
      />
    </svg>
  );
}

/** Compact Apple logo mark for the social button. */
function AppleMark() {
  return (
    <svg
      width="16"
      height="18"
      viewBox="0 0 16 18"
      aria-hidden
      focusable="false"
      fill="currentColor"
    >
      <path d="M12.7 9.5c0-2 1.6-3 1.7-3.1-0.9-1.4-2.4-1.5-2.9-1.6-1.2-0.1-2.4 0.7-3 0.7s-1.6-0.7-2.6-0.7c-1.3 0-2.6 0.8-3.2 2-1.4 2.4-0.4 6 1 8 0.7 0.9 1.5 2 2.6 1.9 1 0 1.5-0.7 2.7-0.7s1.6 0.7 2.7 0.7 1.8-1 2.5-1.9c0.8-1.1 1.1-2.2 1.1-2.3-0.1 0-2.1-0.8-2.1-3zM10.6 3.7c0.6-0.7 1-1.7 0.9-2.7-0.9 0-1.9 0.6-2.5 1.3-0.5 0.6-1 1.6-0.9 2.6 1 0.1 1.9-0.5 2.5-1.2z" />
    </svg>
  );
}
