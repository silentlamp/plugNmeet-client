import { FormEvent, useState } from 'react';

import { loginWithPassword, ZenApiError } from '../api/zenleaderApi';

type LoginPageProps = {
  onSuccess: () => void;
};

/**
 * ZenLeader sign-in form for the meet portal (email + password).
 *
 * @param onSuccess - called after tokens are stored successfully
 */
export function LoginPage({ onSuccess }: LoginPageProps) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get('email') ?? '').trim();
    const password = String(form.get('password') ?? '');

    setSubmitting(true);
    try {
      await loginWithPassword(email, password);
      onSuccess();
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
    <div className="zl-panel">
      <div className="zl-brand">
        <img src="./assets/imgs/logo-zenleader.png" alt="ZenLeader" />
        <h1>ZenLeader Meet</h1>
        <p>
          Sign in to join a live room or open an event you are interested in.
        </p>
      </div>

      {error ? (
        <div className="zl-alert" role="alert">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} autoComplete="on">
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
  );
}
