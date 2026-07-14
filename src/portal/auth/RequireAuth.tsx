import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { hasZenSession } from '../auth/session';

/**
 * Guards authenticated portal routes; redirects to login with next path.
 */
export function RequireAuth() {
  const location = useLocation();

  if (!hasZenSession()) {
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
