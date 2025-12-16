import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "react-toastify";

/**
 * This page manages ACCOUNT data:
 * - Email (readonly for now)
 * - Password change (optional implementation)
 * - Account deletion (future)
 */

export function SettingsAccountPage() {
  const { user } = useAuth();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  if (!user) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-heading text-white">Account Settings</h1>
        <p className="text-gray-400">Loading account information…</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitPassword = async (e: FormEvent) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // TODO — integrate with backend (auth controller)
    toast.info("Password change endpoint not yet implemented.");
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-heading text-white">Account Settings</h1>
        <p className="text-gray-400">Manage your login and security.</p>
      </div>

      {/* EMAIL DISPLAY */}
      <div className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6 space-y-4">
        <label className="block text-sm font-medium text-gray-300">
          Email Address
        </label>
        <input
          type="text"
          value={user.email}
          disabled
          className="w-full rounded-md bg-black/50 border border-gray-700 px-3 py-2 text-sm text-gray-400"
        />
        <p className="text-xs text-gray-500">
          Your email is used for login and notifications.
        </p>
      </div>

      {/* PASSWORD CHANGE */}
      <form
        onSubmit={handleSubmitPassword}
        className="bg-[#0B0B0B]/90 border border-gray-800 rounded-lg p-6 space-y-6"
      >
        <h2 className="text-lg font-semibold text-white">Change Password</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Current Password
          </label>
          <input
            type="password"
            name="currentPassword"
            value={form.currentPassword}
            onChange={handleChange}
            className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            New Password
          </label>
          <input
            type="password"
            name="newPassword"
            value={form.newPassword}
            onChange={handleChange}
            className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            className="w-full rounded-md bg-black/60 border border-gray-700 px-3 py-2 text-sm text-white"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-500 transition-colors"
        >
          Update Password
        </button>
      </form>

      {/* FUTURE SECTION — DELETE ACCOUNT */}
      <div className="bg-[#200000]/40 border border-red-800 rounded-lg p-6 space-y-4">
        <h2 className="text-lg font-semibold text-red-400">Danger Zone</h2>
        <p className="text-sm text-gray-400">
          Deleting your account is permanent and cannot be undone.
        </p>
        <button
          disabled
          className="rounded-md bg-red-700/40 px-4 py-2 text-sm text-red-200 cursor-not-allowed"
        >
          Delete Account (coming soon)
        </button>
      </div>
    </div>
  );
}
