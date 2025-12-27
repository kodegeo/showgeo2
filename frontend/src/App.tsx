import { useEffect } from "react";
import { CreatorLayout } from "@/layouts/CreatorLayout";

import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { CreatorRoute } from "@/components/CreatorRoute";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProfileSetupPage } from "@/pages/ProfileSetupPage";
import { CreatorDashboardPage } from "@/pages/creator/CreatorDashboardPage";
import { CreatorEventsPage } from "@/pages/creator/CreatorEventsPage";
import { CreatorStorePage } from "@/pages/creator/CreatorStorePage";
import { CreatorAnalyticsPage } from "@/pages/creator/CreatorAnalyticsPage";
import { CreatorProfilePage } from "@/pages/creator/CreatorProfilePage";
import { CreatorApplicationPage } from "@/pages/creator/CreatorApplicationPage";
import { SettingsLayout } from "@/components/settings/SettingsLayout";
import { SettingsHomePage } from "@/pages/settings/SettingsHomePage";
import { SettingsProfilePage } from "@/pages/settings/SettingsProfilePage";
import { SettingsAccountPage } from "@/pages/settings/SettingsAccountPage";
import { SettingsCreatorPage } from "@/pages/settings/SettingsCreatorPage";
import { ProfileSetupGuard } from "@/components/ProfileSetupGuard";
import { EntityEditPage } from "@/pages/entity/EntityEditPage";
import { PublicEntityPage } from "@/pages/entity/PublicEntityPage";
import EntityProfilePage  from "@/pages/entity/EntityProfilePage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { CreateEventPage } from "@/components/creator/CreateEventPage";
import { CreatorEventDetailPage } from "@/pages/creator/CreatorEventDetailPage";
import { CreatorEventEditPage } from "@/pages/creator/CreatorEventEditPage";
import { CreatorEventTicketsPage } from "@/pages/creator/CreatorEventTicketsPage";
import { EventWatchPage } from "@/pages/creator/events/EventWatchPage";
import { EventLivePage } from "@/pages/creator/events/EventLivePage";

function App() {
  useEffect(() => {
    const hash = window.location.hash;

    if (hash.includes("type=recovery")) {
      // Redirect to reset-password page WITH the hash
      window.location.href = `/reset-password${hash}`;
    }
  }, []);

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/entities/:slug" element={<CreatorProfilePage />} />

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
            <ProfileSetupGuard>
              <ProfilePage />
            </ProfileSetupGuard>
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
        path="/settings/creator"
        element={
          <ProtectedRoute>
            <SettingsLayout>
              <SettingsCreatorPage />
            </SettingsLayout>
          </ProtectedRoute>
        }
      />

      {/* Event Watch Route */}
      <Route path="/events/:id/watch" element={<EventWatchPage />} />
      {/* Event Live Route - Full broadcast experience */}
      <Route
        path="/events/:id/live"
        element={
          <ProtectedRoute>
            <EventLivePage />
          </ProtectedRoute>
        }
      />

      {/* Creator Routes */}
      <Route path="/creator" element={<CreatorRoute><CreatorLayout /></CreatorRoute>}>
        <Route path="dashboard" element={<CreatorDashboardPage />} />
        <Route path="events" element={<CreatorEventsPage />} />
        <Route path="events/new" element={<CreateEventPage />} />
        <Route path="events/:id" element={<CreatorEventDetailPage />} />
        <Route path="events/:id/edit" element={<CreatorEventEditPage />} />
        <Route path="events/:id/tickets" element={<CreatorEventTicketsPage />} />
        <Route path="application" element={<CreatorApplicationPage />} />
      </Route>

      <Route path="/entity/profile" element={<EntityProfilePage />} />
      <Route path="/entity/edit" element={<EntityEditPage />} />
      <Route path="/entity/:slug" element={<PublicEntityPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Catch all - redirect to home */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;

