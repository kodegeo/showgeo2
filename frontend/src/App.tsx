import { useEffect, type ReactNode } from "react";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { AdminLayout } from "@/layouts/AdminLayout";
import { UserRoute } from "@/components/UserRoute";

import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { StudioRoute } from "@/components/StudioRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AuthRedirect } from "@/components/AuthRedirect";
import { HomeRedirect } from "@/routes/HomeRedirect";
import { CreatorRouteGuard } from "@/routes/CreatorRouteGuard";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileSetupPage } from "@/pages/ProfileSetupPage";
import { CreatorOverviewPage } from "@/pages/studio/CreatorOverviewPage";
import { CreatorCommunityPage } from "@/pages/studio/CreatorCommunityPage";
import { CreatorDashboardPage as CreatorDashboardPageStandalone } from "@/pages/creator/CreatorDashboardPage";
import { CreatorRevenuePage } from "@/pages/creator/CreatorRevenuePage";
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
import { CreateEventPage as CreateEventWizardPage } from "@/pages/studio/CreateEventPage";
import { EventStudioPage } from "@/pages/studio/EventStudioPage";
import { CreatorEventDetailPage } from "@/pages/studio/CreatorEventDetailPage";
import { CreatorEventEditPage } from "@/pages/studio/CreatorEventEditPage";
import { CreatorEventTicketsPage } from "@/pages/studio/CreatorEventTicketsPage";
import { CreatorEventManagePage } from "@/pages/studio/events/CreatorEventManagePage";
import { CreatorEventAccessPage } from "@/pages/studio/events/CreatorEventAccessPage";
import { CreatorEventBlastPage } from "@/pages/studio/events/CreatorEventBlastPage";
import { CreatorEventInvitationsPage } from "@/pages/studio/CreatorEventInvitationsPage";
import { EventAnalyticsPage } from "@/pages/creator/EventAnalyticsPage";
import { EventWatchPage } from "@/pages/studio/events/EventWatchPage";
import { FanWatchProviders } from "@/components/events/FanWatchProviders";
import { EventLivePage } from "@/pages/studio/events/EventLivePage";
import { CoordinatorLivePage } from "@/pages/studio/events/CoordinatorLivePage";
import { EventLandingPage } from "@/pages/events/EventLandingPage";
import { EventLobbyPage } from "@/pages/events/EventLobbyPage";
import { EventLifecycleManager } from "@/lib/event-client";
import { EventRegisterPage } from "@/pages/events/EventRegisterPage";
import { TourPage } from "@/pages/tours/TourPage";
import { MailboxPage } from "@/pages/MailboxPage";
import { ProductionConsolePage } from "@/pages/producer/ProductionConsolePage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDashboardPage } from "@/pages/admin/AdminDashboardPage";
import { AdminStreamsPage } from "@/pages/admin/AdminStreamsPage";
import { AdminAuditPage } from "@/pages/admin/AdminAuditPage";
import { CreatorsPage } from "@/pages/CreatorsPage";
import { EventsPage } from "@/pages/EventsPage";
import { LiveNowPage } from "@/pages/LiveNowPage";
import { ClipsFeedPage } from "@/pages/clips/ClipsFeedPage";
import { ClipDetailPage } from "@/pages/clips/ClipDetailPage";
import { DiscoverPage } from "@/pages/discover/DiscoverPage";
import { TicketsPage } from "@/pages/TicketsPage";
import { PaymentSuccessPage } from "@/pages/PaymentSuccessPage";
import { PaymentCancelPage } from "@/pages/PaymentCancelPage";

function EventLifecycleWrapper({ children }: { children: ReactNode }) {
  const { id: eventId } = useParams<{ id: string }>();
  return <EventLifecycleManager eventId={eventId ?? undefined}>{children}</EventLifecycleManager>;
}

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
        <Route path="/home" element={<HomeRedirect />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/creators" element={<CreatorsPage />} />
        <Route path="/creators/:slug" element={<PublicCreatorProfilePage />} />
        <Route path="/live" element={<LiveNowPage />} />
        <Route path="/discover" element={<DiscoverPage />} />
        <Route path="/clips" element={<ClipsFeedPage />} />
        <Route path="/clips/:id" element={<ClipDetailPage />} />
        <Route path="/tours/:slug" element={<TourPage />} />
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
        <Route
          path="/mailbox"
          element={
            <ProtectedRoute>
              <MailboxPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tickets"
          element={
            <ProtectedRoute>
              <TicketsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payments/success"
          element={
            <ProtectedRoute>
              <PaymentSuccessPage />
            </ProtectedRoute>
          }
        />
        <Route path="/payments/cancel" element={<PaymentCancelPage />} />

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
        {/* Event Watch / Live / Register - more specific first */}
        <Route
          path="/events/:id/watch"
          element={
            <FanWatchProviders>
              <EventWatchPage />
            </FanWatchProviders>
          }
        />
        <Route
          path="/events/:id/lobby"
          element={
            <EventLifecycleWrapper>
              <EventLobbyPage />
            </EventLifecycleWrapper>
          }
        />
        <Route path="/events/:id/register" element={<EventRegisterPage />} />
        {/* Fan / public live watch (ticket or access code). Creator broadcast uses /studio/events/:id/live */}
        <Route
          path="/events/:id/live"
          element={
            <FanWatchProviders>
              <EventWatchPage />
            </FanWatchProviders>
          }
        />
        {/* Event landing page - single event details + Like/Follow/Notify */}
        <Route path="/events/:id" element={<EventLandingPage />} />

        {/* Creator dashboard at /creator/dashboard (authenticated creators only) */}
        <Route
          path="/creator/dashboard"
          element={
            <ProtectedRoute>
              <StudioRoute>
                <CreatorDashboardPageStandalone />
              </StudioRoute>
            </ProtectedRoute>
          }
        />

        {/* Event revenue dashboard at /creator/events/:id/revenue */}
        <Route
          path="/creator/events/:id/revenue"
          element={
            <ProtectedRoute>
              <StudioRoute>
                <CreatorRevenuePage />
              </StudioRoute>
            </ProtectedRoute>
          }
        />

        {/* Creator workspace: guard then redirect other /creator/* -> /studio/* */}
        <Route path="/creator/*" element={<CreatorRouteGuard />} />

        {/* Event manage hub — full path + index so Outlet always receives the page (reliable with nested /studio layout) */}
        <Route
          path="/studio/events/:id/manage"
          element={
            <StudioRoute>
              <CreatorDashboardLayout />
            </StudioRoute>
          }
        >
          <Route index element={<CreatorEventManagePage />} />
        </Route>

        {/* Full-viewport studio surfaces (no CreatorDashboardLayout — avoids stacking nav + live/control rails) */}
        <Route
          path="/studio/events/:id/live"
          element={
            <StudioRoute>
              <EventLivePage />
            </StudioRoute>
          }
        />
        <Route
          path="/studio/events/:id/control"
          element={
            <StudioRoute>
              <CoordinatorLivePage />
            </StudioRoute>
          }
        />

        {/* Studio (creator workspace) routes */}
        <Route
          path="/studio"
          element={
            <StudioRoute>
              <CreatorDashboardLayout />
            </StudioRoute>
          }
        >
          <Route index element={<Navigate to="/studio/overview" replace />} />
          <Route path="overview" element={<CreatorOverviewPage />} />
          <Route path="dashboard" element={<Navigate to="/studio/overview" replace />} />
          <Route path="community" element={<CreatorCommunityPage />} />
          <Route path="events" element={<CreatorEventsPage />} />
          <Route path="events/new" element={<CreateEventPage />} />
          <Route path="events/create" element={<CreateEventWizardPage />} />
          <Route path="events/:id" element={<EventStudioPage />} />
          <Route path="events/:id/dashboard" element={<CreatorEventDetailPage />} />
          <Route path="events/:id/edit" element={<CreatorEventEditPage />} />
          <Route path="events/:id/access" element={<CreatorEventAccessPage />} />
          <Route path="events/:id/tickets" element={<CreatorEventTicketsPage />} />
          <Route path="events/:id/invitations" element={<CreatorEventInvitationsPage />} />
          <Route path="events/:id/blast" element={<CreatorEventBlastPage />} />
          <Route path="events/:id/analytics" element={<EventAnalyticsPage />} />
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
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="streams" element={<AdminStreamsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>

        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Catch all - redirect to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
