import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from './auth/RequireAuth';
import { PortalShell } from './layouts/PortalShell';
import { CourseRunDetailPage } from './pages/CourseRunDetailPage';
import { EventsPage } from './pages/EventsPage';
import { LoginPage } from './pages/LoginPage';
import { MyCoursesPage } from './pages/MyCoursesPage';

/**
 * ZenLeader learner portal router (hosted on portal.zenleader.xyz).
 */
export function PortalApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route
            element={
              <div className="zl-shell zl-shell-hub">
                <PortalShell />
              </div>
            }
          >
            <Route index element={<Navigate to="/my-courses" replace />} />
            <Route path="/my-courses" element={<MyCoursesPage />} />
            <Route
              path="/my-courses/:courseRunId"
              element={<CourseRunDetailPage />}
            />
            <Route path="/events" element={<EventsPage />} />
            <Route
              path="/join"
              element={<Navigate to="/my-courses" replace />}
            />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/my-courses" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
