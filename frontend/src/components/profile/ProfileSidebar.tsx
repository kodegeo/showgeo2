import { NavLink, useLocation } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useFollowers, useFollowing } from "@/hooks/useFollow";
import {
  LayoutDashboard,
  Mail,
  Search,
  Calendar,
  DoorOpen,
  Radio,
  Heart,
  Podcast,
  Sparkles,
  Settings,
  ShoppingBag,
  Users,
  UserPlus,
  Building2,
  Menu,
  X,
  Sun,
  Moon,
  Monitor,
  Camera,
  Loader2,
} from "lucide-react";
import { useUploadAsset } from "@/hooks/useAssets";
import { AssetType, AssetOwnerType } from "../../../../packages/shared/types";
import { useRef } from "react";

import { useEntityContext } from "@/hooks/useEntityContext";

interface SidebarItem {
  label: string;
  path?: string;
  icon: React.ReactNode;
  section?: "main" | "settings";
  action?: () => void;
}

export function ProfileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [theme, setTheme] = useState<"dark" | "standard" | "light">(() => {
    const saved = localStorage.getItem("profile-theme") as "dark" | "standard" | "light";
    return saved || "dark";
  });
  const location = useLocation();
  const { user, refetchUser } = useAuth();

  const { currentEntity } = useEntityContext();
  const entityId = currentEntity?.id || "";

  const { data: followersData } = useFollowers(entityId, 1, 1);
  const { data: followingData } = useFollowing(user?.id || "", 1, 1);
    
  const uploadAsset = useUploadAsset();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);


  const followerCount = followersData?.meta?.total || 0;
  const followingCount = followingData?.meta?.total || 0;
  

  const defaultAvatar = "/assets/defaults/profile-picture.png";
  const avatarUrl = user?.profile?.avatarUrl ? user.profile.avatarUrl : defaultAvatar;

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
  
    // Validate type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }
  
    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("Image must be smaller than 5MB");
      return;
    }
  
    setIsUploadingAvatar(true);
  
    try {
      // Upload via the shared hook
      await uploadAsset.mutateAsync({
        file,
        type: AssetType.IMAGE,
        ownerType: AssetOwnerType.USER,
        ownerId: user.id,
        isPublic: true,
        metadata: {
          purpose: "avatar",
          uploadedAt: new Date().toISOString(),
        },
      });
  
      // Refresh user so new avatar appears immediately
      await refetchUser();
    } catch (err) {
      console.error("Failed to upload avatar:", err);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setIsUploadingAvatar(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };
        
  const handleThemeChange = () => {
    const nextTheme = theme === "dark" ? "standard" : theme === "standard" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("profile-theme", nextTheme);
    // Apply theme class to document
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  const mainItems: SidebarItem[] = [
    {
      label: "Layouts",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    {
      label: "Mailbox",
      path: "/profile/mailbox",
      icon: <Mail className="w-5 h-5" />,
    },
    {
      label: "Find Artists",
      path: "/entities",
      icon: <Search className="w-5 h-5" />,
    },
    {
      label: "Find Events",
      path: "/events",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      label: "Find Rooms",
      path: "/rooms",
      icon: <DoorOpen className="w-5 h-5" />,
    },
    {
      label: "Live Now",
      path: "/live",
      icon: <Radio className="w-5 h-5" />,
    },
    {
      label: "Favorites",
      path: "/profile/favorites",
      icon: <Heart className="w-5 h-5" />,
    },
    {
      label: "Podcasts",
      path: "/profile/podcasts",
      icon: <Podcast className="w-5 h-5" />,
    },
    {
      label: "Recommendations",
      path: "/profile/recommendations",
      icon: <Sparkles className="w-5 h-5" />,
    },
  ];

  const settingsItems: SidebarItem[] = [
    {
      label: "Profile Settings",
      path: "/settings",
      icon: <Settings className="w-5 h-5" />,
      section: "settings",
    },
    {
      label: "Order History",
      path: "/profile/orders",
      icon: <ShoppingBag className="w-5 h-5" />,
      section: "settings",
    },
    {
      label: "Artists (Following)",
      path: "/profile/following/artists",
      icon: <Users className="w-5 h-5" />,
      section: "settings",
    },
    {
      label: "Friends (Following)",
      path: "/profile/following/friends",
      icon: <UserPlus className="w-5 h-5" />,
      section: "settings",
    },
    {
      label: "Creators (Following)",
      path: "/profile/following/creators",
      icon: <Building2 className="w-5 h-5" />,
      section: "settings",
    },
  ];

  const getThemeIcon = () => {
    switch (theme) {
      case "dark":
        return <Moon className="w-5 h-5" />;
      case "light":
        return <Sun className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <>
      {/* Desktop Sidebar - Scrolls with main content area */}
      <aside className="hidden lg:block w-64 flex-shrink-0 bg-[#0B0B0B] border-r border-gray-800">
        <div className="flex flex-col">
          {/* Spacer for banner height */}
          <div className="h-48 md:h-64 lg:h-72" />
          
          {/* User Avatar and Details at Top - Compact profile card */}
          {user && (
            <div className="px-4 pt-4 pb-4 border-b border-gray-800 bg-[#0B0B0B]">
              <div className="flex flex-col items-center gap-3">
                {/* Avatar - Smaller, compact */}
                <div className="relative group">
                  <div
                    className="w-20 h-20 rounded-full border-2 border-[#0B0B0B] bg-[#0B0B0B] overflow-hidden shadow-lg cursor-pointer relative ring-1 ring-gray-800"
                    onClick={handleAvatarClick}
                  >
                    <img
                      src={avatarUrl}
                      alt={user.profile?.firstName || user.email}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        if ((e.target as HTMLImageElement).src !== defaultAvatar) {
                          (e.target as HTMLImageElement).src = defaultAvatar;
                        }
                      }}
                    />
                    {/* Upload overlay on hover */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      {isUploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  {/* Hidden file input for avatar */}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                    disabled={isUploadingAvatar}
                  />
                </div>

                {/* User Name and Handle - Compact */}
                <div className="text-center w-full">
                  <h2 className="text-lg font-heading font-bold text-white mb-0.5 uppercase tracking-tight line-clamp-1">
                    {user.profile?.firstName && user.profile?.lastName
                      ? `${user.profile.firstName} ${user.profile.lastName}`
                      : user.profile?.firstName || user.email?.split("@")[0] || "User"}
                  </h2>
                  {user.profile?.username && (
                    <p className="text-[#9A9A9A] font-body text-xs">@{user.profile.username}</p>
                  )}
                </div>

                {/* Follower Stats - Compact, horizontal */}
                <div className="flex items-center justify-center gap-4 w-full pt-1">
                  <div className="text-center">
                    <div className="text-base font-heading font-bold text-white">
                      {followerCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                      Followers
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-base font-heading font-bold text-white">
                      {followingCount.toLocaleString()}
                    </div>
                    <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                      Following
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {mainItems.map((item) => {
              if (item.label === "Layouts") {
                return (
                  <button
                    key={item.label}
                    onClick={handleThemeChange}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 transition-all duration-300 group"
                    aria-label={item.label}
                    title={`Current theme: ${theme.charAt(0).toUpperCase() + theme.slice(1)}. Click to change.`}
                  >
                    <span className="text-[#CD000E] group-hover:text-[#F49600] transition-colors">
                      {getThemeIcon()}
                    </span>
                    <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              }

              if (item.action) {
                return (
                  <button
                    key={item.path || item.label}
                    onClick={item.action}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 transition-all duration-300 group"
                    aria-label={item.label}
                  >
                    <span className="text-[#CD000E] group-hover:text-[#F49600] transition-colors">
                      {item.icon}
                    </span>
                    <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              }

              return (
                <NavLink
                  key={item.path}
                  to={item.path || "#"}
                  className={({ isActive: active }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                      active || isActive(item.path)
                        ? "bg-[#CD000E] text-white font-semibold shadow-lg shadow-[#CD000E]/20"
                        : "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50"
                    }`
                  }
                >
                  <span
                    className={
                      isActive(item.path)
                        ? "text-white"
                        : "text-[#CD000E] group-hover:text-[#F49600] transition-colors"
                    }
                  >
                    {item.icon}
                  </span>
                  <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                </NavLink>
              );
            })}

            {/* Divider */}
            <div className="my-4 border-t border-gray-800" />

            {/* Settings Section */}
            {settingsItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path || "#"}
                className={({ isActive: active }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                    active || isActive(item.path)
                      ? "bg-[#CD000E] text-white font-semibold shadow-lg shadow-[#CD000E]/20"
                      : "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50"
                  }`
                }
              >
                <span
                  className={
                    isActive(item.path)
                      ? "text-white"
                      : "text-[#CD000E] group-hover:text-[#F49600] transition-colors"
                  }
                >
                  {item.icon}
                </span>
                <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-[90px] left-4 z-50 p-2 bg-[#0B0B0B] border border-gray-800 rounded-lg text-white hover:bg-gray-800 transition-colors"
        aria-label="Toggle sidebar"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Sidebar */}
      {isOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />
          <aside className="lg:hidden w-64 bg-[#0B0B0B] border-r border-gray-800 overflow-y-auto">
            <div className="flex flex-col h-full">
              {/* User Avatar and Details at Top - Compact */}
              {user && (
                <div className="px-4 pt-4 pb-4 border-b border-gray-800 bg-[#0B0B0B]">
                  <div className="flex flex-col items-center gap-3">
                    {/* Avatar - Compact */}
                    <div className="relative group">
                      <div
                        className="w-20 h-20 rounded-full border-2 border-[#0B0B0B] bg-[#0B0B0B] overflow-hidden shadow-lg cursor-pointer relative ring-1 ring-gray-800"
                        onClick={handleAvatarClick}
                      >
                        <img
                          src={avatarUrl}
                          alt={user.profile?.firstName || user.email}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            if ((e.target as HTMLImageElement).src !== defaultAvatar) {
                              (e.target as HTMLImageElement).src = defaultAvatar;
                            }
                          }}
                        />
                        {/* Upload overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                          {isUploadingAvatar ? (
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          ) : (
                            <Camera className="w-6 h-6 text-white" />
                          )}
                        </div>
                      </div>
                      {/* Hidden file input for avatar */}
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                        disabled={isUploadingAvatar}
                      />
                    </div>

                    {/* User Name and Handle - Compact */}
                    <div className="text-center w-full">
                      <h2 className="text-lg font-heading font-bold text-white mb-0.5 uppercase tracking-tight line-clamp-1">
                        {user.profile?.firstName && user.profile?.lastName
                          ? `${user.profile.firstName} ${user.profile.lastName}`
                          : user.profile?.firstName || user.email?.split("@")[0] || "User"}
                      </h2>
                      {user.profile?.username && (
                        <p className="text-[#9A9A9A] font-body text-xs">@{user.profile.username}</p>
                      )}
                    </div>

                    {/* Follower Stats - Compact, horizontal */}
                    <div className="flex items-center justify-center gap-4 w-full pt-1">
                      <div className="text-center">
                        <div className="text-base font-heading font-bold text-white">
                          {followerCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                          Followers
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-base font-heading font-bold text-white">
                          {followingCount.toLocaleString()}
                        </div>
                        <div className="text-xs text-[#9A9A9A] font-body uppercase tracking-wider">
                          Following
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Navigation */}
              <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                {mainItems.map((item) => {
                  if (item.label === "Layouts") {
                    return (
                      <button
                        key={item.label}
                        onClick={handleThemeChange}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 transition-all duration-300 group"
                        aria-label={item.label}
                      >
                        <span className="text-[#CD000E] group-hover:text-[#F49600] transition-colors">
                          {getThemeIcon()}
                        </span>
                        <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                      </button>
                    );
                  }

                  if (item.action) {
                    return (
                      <button
                        key={item.path || item.label}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[#9A9A9A] hover:text-white hover:bg-gray-800/50 transition-all duration-300 group"
                        aria-label={item.label}
                      >
                        <span className="text-[#CD000E] group-hover:text-[#F49600] transition-colors">
                          {item.icon}
                        </span>
                        <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path || "#"}
                      className={({ isActive: active }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                          active || isActive(item.path)
                            ? "bg-[#CD000E] text-white font-semibold shadow-lg shadow-[#CD000E]/20"
                            : "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50"
                        }`
                      }
                    >
                      <span
                        className={
                          isActive(item.path)
                            ? "text-white"
                            : "text-[#CD000E] group-hover:text-[#F49600] transition-colors"
                        }
                      >
                        {item.icon}
                      </span>
                      <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                    </NavLink>
                  );
                })}

                {/* Divider */}
                <div className="my-4 border-t border-gray-800" />

                {/* Settings Section */}
                {settingsItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path || "#"}
                    className={({ isActive: active }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 group ${
                        active || isActive(item.path)
                          ? "bg-[#CD000E] text-white font-semibold shadow-lg shadow-[#CD000E]/20"
                          : "text-[#9A9A9A] hover:text-white hover:bg-gray-800/50"
                      }`
                    }
                  >
                    <span
                      className={
                        isActive(item.path)
                          ? "text-white"
                          : "text-[#CD000E] group-hover:text-[#F49600] transition-colors"
                      }
                    >
                      {item.icon}
                    </span>
                    <span className="font-body text-sm uppercase tracking-wider">{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          </aside>
        </>
      )}

    </>
  );
}

