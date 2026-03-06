import { useEffect } from "react";
import { StudioLayout } from "@/layouts/StudioLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { UserRoute } from "@/components/UserRoute";

import { Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudioRoute } from "@/components/StudioRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AuthRedirect } from "@/components/AuthRedirect";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileSetupPage } from "@/pages/ProfileSetupPage";
import { CreatorDashboardPage } from "@/pages/studio/CreatorDashboardPage";
import { CreatorEventsPage } from "@/pages/studio/CreatorEventsPage";
import { CreatorStorePage } from "@/pages/studio/CreatorStorePage";
import { CreatorAnalyticsPage } from "@/pages/studio/CreatorAnalyticsPage";
import { CreatorApplicationPage } from "@/pages/studio/CreatorApplicationPage";
import CreatorStatusPage from "@/pages/studio/CreatorStatusPage";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { SettingsHomePage } from "@/pages/settings/SettingsHomePage";
import { SettingsProfilePage } from "@/pages/settings/SettingsProfilePage";
import { SettingsAccountPage } from "@/pages/settings/SettingsAccountPage";
import { SettingsNotificationsPage } from "@/pages/settings/SettingsNotificationsPage";
import { SettingsCreatorPage } from "@/pages/settings/SettingsCreatorPage";
import { ProfileSetupGuard } from "@/components/ProfileSetupGuard";
import { EntityEditPage } from "@/pages/entity/EntityEditPage";
import EntityProfilePage from "@/pages/entity/EntityProfilePage";
import { PublicCreatorProfilePage } from "@/pages/creators/PublicCreatorProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { CreateEventPage } from "@/components/creator/CreateEventPage";
import { CreatorEventDetailPage } from "@/pages/studio/CreatorEventDetailPage";
import { CreatorEventEditPage } from "@/pages/studio/CreatorEventEditPage";
import { CreatorEventTicketsPage } from "@/pages/studio/CreatorEventTicketsPage";
import { CreatorEventBlastPage } from "@/pages/studio/events/CreatorEventBlastPage";
import { EventWatchPage } from "@/pages/studio/events/EventWatchPage";
import { EventLivePage } from "@/pages/studio/events/EventLivePage";
import { EventLandingPage } from "@/pages/events/EventLandingPage";
import { MailboxPage } from "@/pages/MailboxPage";
import { ProductionConsolePage } from "@/pages/producer/ProductionConsolePage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { CreatorsPage } from "@/pages/CreatorsPage";
import { EventsPage } from "@/pages/EventsPage";

function RedirectEntitiesToCreators() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/creators/${slug}` : "/creators"} replace />;
}

function RedirectEntityToCreators() {
  const { slug } = useParams<{ slug: string }>();
  return <Navigate to={slug ? `/creators/${slug}` : "/creators"} replace />;
}

function RedirectEntityProfile() {
  return <Navigate to="/studio/profile" replace />;
}

function RedirectCreatorToStudio() {
  const location = useLocation();
  const to = location.pathname.replace(/^\/creator/, "/studio") + (location.search ?? "") + (location.hash ?? "");
  return <Navigate to={to} replace />;
}

function App() {
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("type=recovery")) {
      // Redirect to reset-password page WITH the hash
      window.location.href = `/reset-password${hash}`;
    }
  }, []);

  return (
    <>
      {/* Centralized auth redirect handler - runs outside Routes to avoid conflicts */}
      <AuthRedirect />
      
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/creators" element={<CreatorsPage />} />
      <Route path="/creators/:slug" element={<PublicCreatorProfilePage />} />
      <Route path="/entities" element={<Navigate to="/creators" replace />} />
      <Route path="/entities/:slug" element={<RedirectEntitiesToCreators />} />
      <Route path="/entity/:slug" element={<RedirectEntityToCreators />} />
      <Route path="/entity/profile" element={<RedirectEntityProfile />} />

      {/* Protected routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
<Route
  path="/profile"
  element={
    <ProtectedRoute>
      <UserRoute>
        <ProfileSetupGuard>
          <ProfilePage />
        </ProfileSetupGuard>
      </UserRoute>
    </ProtectedRoute>
  }
/>
      <Route
        path="/profile/setup"
        element={
          <ProtectedRoute>
            <ProfileSetupPage /> 
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile/mailbox"
        element={
          <ProtectedRoute>
            <ProfileSetupGuard>
              <MailboxPage />
            </ProfileSetupGuard>
          </ProtectedRoute>
        }
      />

      {/* Settings Routes */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsHomePage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/profile"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsProfilePage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/account"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsAccountPage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/notifications"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsNotificationsPage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings/creator"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsCreatorPage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />

      {/* Events list - exact path first */}
      <Route path="/events" element={<EventsPage />} />
      {/* Event Watch / Live - more specific first */}
      <Route path="/events/:id/watch" element={<EventWatchPage />} />
      <Route
        path="/events/:id/live"
        element={
          <ProtectedRoute>
            <EventLivePage />
          </ProtectedRoute>
        }
      />
      {/* Event landing page - single event details + Like/Follow/Notify */}
      <Route path="/events/:id" element={<EventLandingPage />} />

      {/* Legacy: redirect /creator/* -> /studio/* */}
      <Route path="/creator/*" element={<RedirectCreatorToStudio />} />

      {/* Studio (creator workspace) routes */}
      <Route path="/studio" element={<StudioRoute><StudioLayout /></StudioRoute>}>
        <Route path="dashboard" element={<CreatorDashboardPage />} />
        <Route path="events" element={<CreatorEventsPage />} />
        <Route path="events/new" element={<CreateEventPage />} />
        <Route path="events/:id" element={<CreatorEventDetailPage />} />
        <Route path="events/:id/edit" element={<CreatorEventEditPage />} />
        <Route path="events/:id/tickets" element={<CreatorEventTicketsPage />} />
        <Route path="events/:id/blast" element={<CreatorEventBlastPage />} />
        <Route path="profile" element={<EntityProfilePage />} />
        <Route path="edit" element={<EntityEditPage />} />
        <Route path="analytics" element={<CreatorAnalyticsPage />} />
        <Route path="store" element={<CreatorStorePage />} />
        <Route path="settings" element={<SettingsCreatorPage />} />
        <Route path="application" element={<CreatorApplicationPage />} />
        <Route path="status" element={<CreatorStatusPage />} />
      </Route>

      {/* Production Console Route */}
      <Route
        path="/production/events/:eventId/console"
        element={
          <ProtectedRoute>
            <StudioRoute>
              <ProductionConsolePage />
            </StudioRoute>
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
      </Route>

      <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;

