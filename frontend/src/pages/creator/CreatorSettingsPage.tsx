import { useEntityContext } from "@/hooks/useEntityContext";
import { CreatorDashboardLayout } from "@/components/creator/CreatorDashboardLayout";
import { Settings, User, Store, Bell, Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function CreatorSettingsPage() {
  const { currentEntity } = useEntityContext();

  return (
    <CreatorDashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-heading font-bold text-white mb-2 uppercase tracking-tighter">
            Settings
          </h1>
          <p className="text-[#9A9A9A] font-body">
            Manage your creator profile and preferences
          </p>
        </div>

        {/* Settings Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Settings */}
          <Link
            to="/creator/settings/profile"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  Profile Settings
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Edit your profile information</p>
              </div>
            </div>
          </Link>

          {/* Page Settings */}
          <Link
            to="/creator/settings/page"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <Settings className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  Page Settings
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Customize your creator page</p>
              </div>
            </div>
          </Link>

          {/* Store Settings */}
          <Link
            to="/creator/settings/store"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <Store className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  Store Settings
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Manage store preferences</p>
              </div>
            </div>
          </Link>

          {/* Notification Settings */}
          <Link
            to="/creator/settings/notifications"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  Notifications
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Configure notification preferences</p>
              </div>
            </div>
          </Link>

          {/* User Management */}
          <Link
            to="/creator/settings/users"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <User className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  User Management
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Manage collaborators and roles</p>
              </div>
            </div>
          </Link>

          {/* Security */}
          <Link
            to="/creator/settings/security"
            className="block bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6 hover:border-[#CD000E]/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-[#CD000E]/20 rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#CD000E]" />
              </div>
              <div>
                <h3 className="text-lg font-heading font-semibold text-white uppercase tracking-tight">
                  Security
                </h3>
                <p className="text-sm text-[#9A9A9A] font-body">Account security settings</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Entity Info */}
        {currentEntity && (
          <div className="bg-[#0B0B0B]/90 backdrop-blur-sm border border-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-heading font-semibold text-white mb-4 uppercase tracking-tight">
              Entity Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                  Entity Name
                </div>
                <div className="text-lg font-heading font-semibold text-white">
                  {currentEntity.name}
                </div>
              </div>
              <div>
                <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                  Entity Type
                </div>
                <div className="text-lg font-heading font-semibold text-white capitalize">
                  {currentEntity.type.toLowerCase()}
                </div>
              </div>
              <div>
                <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                  Status
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`
                      px-3 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                      ${currentEntity.isVerified ? "bg-green-900/30 text-green-300" : "bg-gray-800 text-gray-400"}
                    `}
                  >
                    {currentEntity.isVerified ? "Verified" : "Unverified"}
                  </span>
                  <span
                    className={`
                      px-3 py-1 rounded text-xs font-heading font-semibold uppercase tracking-wider
                      ${currentEntity.isPublic ? "bg-blue-900/30 text-blue-300" : "bg-gray-800 text-gray-400"}
                    `}
                  >
                    {currentEntity.isPublic ? "Public" : "Private"}
                  </span>
                </div>
              </div>
              <div>
                <div className="text-sm text-[#9A9A9A] font-body uppercase tracking-wider mb-1">
                  Created
                </div>
                <div className="text-lg font-heading font-semibold text-white">
                  {new Date(currentEntity.createdAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CreatorDashboardLayout>
  );
}













