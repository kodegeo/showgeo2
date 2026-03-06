import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUpdateUserProfile } from "@/hooks/useUsers";
import { toast } from "react-toastify";
import { Mail, Bell } from "lucide-react";

interface NotificationPreferences {
  emailLiveNow: boolean;
  emailReminders: boolean;
}

export function SettingsNotificationsPage() {
  const { user, refetchUser } = useAuth();
  const updateProfile = useUpdateUserProfile();

  // Initialize preferences from user profile (default to true if missing)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    emailLiveNow: true,
    emailReminders: true,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedPreferences, setLastSavedPreferences] = useState<NotificationPreferences | null>(null);

  // Load preferences from user profile
  useEffect(() => {
    if (!user?.profile?.preferences) {
      // Default to true if no preferences exist
      setPreferences({
        emailLiveNow: true,
        emailReminders: true,
      });
      return;
    }

    const userPrefs = user.profile.preferences as {
      notifications?: {
        emailLiveNow?: boolean;
        emailReminders?: boolean;
      };
    };

    setPreferences({
      emailLiveNow: userPrefs.notifications?.emailLiveNow ?? true,
      emailReminders: userPrefs.notifications?.emailReminders ?? true,
    });
  }, [user]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    if (!user) return;

    // Save current state for potential revert
    const previousPreferences = { ...preferences };
    
    // Optimistic update
    const newValue = !preferences[key];
    const newPreferences = {
      ...preferences,
      [key]: newValue,
    };
    setPreferences(newPreferences);
    setIsSaving(true);

    try {
      // Merge with existing preferences to preserve other settings
      const existingPrefs = (user.profile?.preferences as Record<string, unknown>) || {};
      const updatedPreferences = {
        ...existingPrefs,
        notifications: {
          ...(existingPrefs.notifications as Record<string, unknown> || {}),
          ...newPreferences,
        },
      };

      await updateProfile.mutateAsync({
        id: user.id,
        data: {
          preferences: updatedPreferences,
        },
      });

      // Update last saved state
      setLastSavedPreferences(newPreferences);
      
      // Refetch to ensure we have the latest data
      await refetchUser();

      // Show subtle success feedback
      toast.success("Notification preference updated", {
        position: "bottom-right",
        autoClose: 2000,
        hideProgressBar: true,
      });
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      
      // Revert optimistic update on error
      setPreferences(previousPreferences);
      
      toast.error("Failed to update preference. Please try again.", {
        position: "bottom-right",
        autoClose: 3000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading text-white">Notification Preferences</h1>
        <p className="text-gray-400">Loading your preferences…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-heading text-white">Notification Preferences</h1>
        <p className="text-gray-400">
          Mailbox notifications are always available in Showgeo. Email notifications are optional.
        </p>
      </div>

      {/* Notification Preferences Section */}
      <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg shadow-lg p-6">
        <div className="space-y-6">
          {/* Email LIVE NOW Toggle */}
          <div className="flex items-center justify-between py-4 border-b border-gray-800 last:border-b-0">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 bg-[#CD000E]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-[#CD000E]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-heading font-semibold text-white mb-1">
                  Email me when events go LIVE
                </h3>
                <p className="text-sm text-gray-400 font-body">
                  Receive email notifications when events you're registered for go live
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailLiveNow}
                onChange={() => handleToggle("emailLiveNow")}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#CD000E]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CD000E]"></div>
            </label>
          </div>

          {/* Email Reminders Toggle */}
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-10 h-10 bg-[#CD000E]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-[#CD000E]" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-heading font-semibold text-white mb-1">
                  Email me LIVE reminders
                </h3>
                <p className="text-sm text-gray-400 font-body">
                  Receive reminder emails 10 and 30 minutes after events go live (if you haven't joined yet)
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.emailReminders}
                onChange={() => handleToggle("emailReminders")}
                disabled={isSaving}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#CD000E]/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#CD000E]"></div>
            </label>
          </div>
        </div>

        {/* Info Note */}
        <div className="mt-6 pt-6 border-t border-gray-800">
          <p className="text-xs text-gray-500 font-body">
            <strong className="text-gray-400">Note:</strong> Mailbox notifications cannot be disabled and will always appear in your Showgeo mailbox.
          </p>
        </div>
      </div>

      {/* Saving indicator (subtle) */}
      {isSaving && (
        <div className="text-sm text-gray-500 font-body text-center">
          Saving...
        </div>
      )}
    </div>
  );
}

