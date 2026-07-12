/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Portal Google Web OAuth Client ID (GIS). Empty hides Google button. */
  readonly VITE_PORTAL_GOOGLE_CLIENT_ID?: string;
  /** Portal Apple Services ID. Empty hides Apple button. */
  readonly VITE_PORTAL_APPLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
