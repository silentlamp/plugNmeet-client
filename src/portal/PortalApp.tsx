import { useCallback, useState } from 'react';

import { hasZenSession } from './auth/session';
import { HubPage } from './pages/HubPage';
import { LoginPage } from './pages/LoginPage';

type PortalView = 'login' | 'hub';

/**
 * ZenLeader meet portal shell: switches between sign-in and the Dojo-style hub.
 * Uses local view state (no react-router) so Fiber `/login` needs no extra routes.
 */
export function PortalApp() {
  const [view, setView] = useState<PortalView>(() =>
    hasZenSession() ? 'hub' : 'login',
  );

  const goHub = useCallback(() => setView('hub'), []);
  const goLogin = useCallback(() => setView('login'), []);

  return (
    <div className={view === 'hub' ? 'zl-shell zl-shell-hub' : 'zl-shell'}>
      {view === 'login' ? (
        <LoginPage onSuccess={goHub} />
      ) : (
        <HubPage onSignedOut={goLogin} />
      )}
    </div>
  );
}
