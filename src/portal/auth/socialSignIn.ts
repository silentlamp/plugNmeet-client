import {
  getAppleClientId,
  getGoogleClientId,
  getPortalUrl,
} from '../api/zenleaderApi';

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  prompt: (
    momentListener?: (notification: {
      isNotDisplayed: () => boolean;
      isSkippedMoment: () => boolean;
      getNotDisplayedReason?: () => string;
    }) => void,
  ) => void;
  renderButton: (
    parent: HTMLElement,
    options: Record<string, string | number>,
  ) => void;
};

type AppleSignInResponse = {
  authorization?: {
    id_token?: string;
    code?: string;
    state?: string;
  };
  user?: {
    email?: string;
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
};

type AppleIDAuth = {
  init: (config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
    state?: string;
  }) => void;
  signIn: () => Promise<AppleSignInResponse>;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
    AppleID?: { auth?: AppleIDAuth };
  }
}

/**
 * Loads an external script once (idempotent by src URL).
 *
 * @param src - absolute script URL
 */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${src}"]`,
    );
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error(`Failed to load ${src}`)),
        { once: true },
      );
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      script.dataset.loaded = 'true';
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

/**
 * Whether Google Sign-In is configured for the portal.
 */
export function isGoogleSignInConfigured(): boolean {
  return Boolean(getGoogleClientId());
}

/**
 * Whether Apple Sign-In is configured for the portal.
 */
export function isAppleSignInConfigured(): boolean {
  return Boolean(getAppleClientId());
}

/**
 * Opens Google Identity Services and resolves with the ID token (JWT credential).
 *
 * @throws Error when Google client ID is missing or the user cancels / SDK fails
 */
export async function requestGoogleIdToken(): Promise<string> {
  const clientId = getGoogleClientId();
  if (!clientId) {
    throw new Error('Google Sign-In is not configured');
  }

  await loadScript('https://accounts.google.com/gsi/client');
  const googleId = window.google?.accounts?.id;
  if (!googleId) {
    throw new Error('Google Identity Services failed to load');
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const finish = (err?: Error, token?: string) => {
      if (settled) {
        return;
      }
      settled = true;
      if (err) {
        reject(err);
      } else if (token) {
        resolve(token);
      } else {
        reject(new Error('Google Sign-In was cancelled'));
      }
    };

    googleId.initialize({
      client_id: clientId,
      auto_select: false,
      cancel_on_tap_outside: true,
      callback: (response) => {
        const overlay = document.getElementById('zl-google-signin-overlay');
        overlay?.remove();
        if (response.credential) {
          finish(undefined, response.credential);
        } else {
          finish(new Error('Google Sign-In returned no credential'));
        }
      },
    });

    googleId.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        if (document.getElementById('zl-google-signin-overlay')) {
          return;
        }
        const host = document.createElement('div');
        host.id = 'zl-google-signin-overlay';
        host.style.position = 'fixed';
        host.style.inset = '0';
        host.style.display = 'flex';
        host.style.alignItems = 'center';
        host.style.justifyContent = 'center';
        host.style.background = 'rgba(16,17,20,0.45)';
        host.style.zIndex = '9999';
        const panel = document.createElement('div');
        panel.style.background = '#fff';
        panel.style.padding = '20px';
        panel.style.borderRadius = '16px';
        panel.style.minWidth = '280px';
        const btnHost = document.createElement('div');
        const cancel = document.createElement('button');
        cancel.type = 'button';
        cancel.textContent = 'Cancel';
        cancel.style.marginTop = '12px';
        cancel.style.width = '100%';
        cancel.onclick = () => {
          host.remove();
          finish(new Error('Google Sign-In was cancelled'));
        };
        panel.appendChild(btnHost);
        panel.appendChild(cancel);
        host.appendChild(panel);
        document.body.appendChild(host);
        googleId.renderButton(btnHost, {
          theme: 'outline',
          size: 'large',
          width: 280,
          text: 'continue_with',
          shape: 'pill',
        });
      }
    });
  });
}

/**
 * Opens Sign in with Apple (popup) and returns tokens for the ZenLeader API.
 *
 * @throws Error when Apple Services ID is missing or sign-in fails / is cancelled
 */
export async function requestAppleAuthPayload(): Promise<{
  identityToken: string;
  authorizationCode: string;
  userIdentifier?: string;
  givenName?: string;
  familyName?: string;
}> {
  const clientId = getAppleClientId();
  if (!clientId) {
    throw new Error('Apple Sign-In is not configured');
  }

  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
  );
  const appleAuth = window.AppleID?.auth;
  if (!appleAuth) {
    throw new Error('Apple Sign-In SDK failed to load');
  }

  appleAuth.init({
    clientId,
    scope: 'name email',
    redirectURI: `${getPortalUrl()}/login`,
    usePopup: true,
  });

  const result = await appleAuth.signIn();
  const identityToken = result.authorization?.id_token;
  const authorizationCode = result.authorization?.code;
  if (!identityToken || !authorizationCode) {
    throw new Error('Apple Sign-In returned incomplete credentials');
  }

  return {
    identityToken,
    authorizationCode,
    givenName: result.user?.name?.firstName,
    familyName: result.user?.name?.lastName,
  };
}
