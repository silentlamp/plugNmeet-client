import { FormEvent, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';

import { loginWithPassword, ZenApiError } from '../api/zenleaderApi';
import { hasZenSession } from '../auth/session';

/**
 * ZenLeader sign-in form for the learner portal.
 */
export function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  if (hasZenSession()) {
    const next = params.get('next') || '/my-courses';
    return <Navigate to={next} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      const next = params.get('next') || '/my-courses';
      navigate(next, { replace: true });
    } catch (err) {
      const message =
        err instanceof ZenApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Sign in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="zl-shell">
      <div className="zl-panel">
        <div className="zl-brand">
          <img src="/assets/imgs/logo-zenleader.png" alt="ZenLeader" />
          <h1>ZenLeader Meet</h1>
          <p>
            Sign in to open your courses, live schedule, or join a room on the
            web.
          </p>
        </div>

        {error ? (
          <div className="zl-alert" role="alert">
            {error}
          </div>
        ) : null}

        <form onSubmit={(e) => void handleSubmit(e)} autoComplete="on">
          <div className="zl-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              placeholder="you@example.com"
            />
          </div>
          <div className="zl-field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              placeholder="••••••••"
            />
          </div>
          <button
            className="zl-btn zl-btn-primary"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
