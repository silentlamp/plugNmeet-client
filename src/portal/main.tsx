import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { PortalApp } from './PortalApp';
import './portal.css';

const container = document.getElementById('zenleader-portal-root');

if (!container) {
  throw new Error(
    "Root element with ID 'zenleader-portal-root' was not found. Ensure the portal entry HTML includes that element.",
  );
}

createRoot(container).render(
  <StrictMode>
    <PortalApp />
  </StrictMode>,
);
