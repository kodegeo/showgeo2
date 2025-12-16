import { useNavigate } from "react-router-dom";
import { User, Settings as SettingsIcon, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { EntityStatus } from "../../../../packages/shared/types";
import { useEffect, useState } from "react";
import { api } from "@/lib/axios";

export function SettingsHomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Safely derived ID for TS
  const userId = user?.id;

  const [creatorStatus, setCreatorStatus] =
    useState<EntityStatus | "NONE" | "LOADING">("LOADING");

  // Load creator entity status
  useEffect(() => {
    if (!userId) {
      setCreatorStatus("NONE");
      return;
    }

    async function fetchEntityStatus() {
      try {
        const res = await api.get(`/users/${userId}/entities`);
        const entity = res.data?.[0] || null;
        setCreatorStatus(entity?.status ?? "NONE");
      } catch (error) {
        console.error("Failed to load creator entity", error);
        setCreatorStatus("NONE");
      }
    }

    fetchEntityStatus();
  }, [userId]);

  // Loading / unauthenticated state
  if (!user) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-gray-400">Loading your account…</p>
      </div>
    );
  }

  const getCreatorButtonLabel = () => {
    switch (creatorStatus) {
      case "LOADING":
        return "Loading…";
      case EntityStatus.PENDING:
        return "Creator Application Pending";
      case EntityStatus.APPROVED:
        return "Manage Creator Profile";
      case EntityStatus.REJECTED:
        return "Reapply to Become a Creator";
      default:
        return "Become a Creator";
    }
  };

  const handleCreatorClick = () => {
    if (creatorStatus === EntityStatus.PENDING) return;

    if (creatorStatus === EntityStatus.APPROVED) {
      return navigate("/creator/profile"); // or /creator/dashboard
    }

    navigate("/settings/creator");
  };

  const cards = [
    {
      title: "Edit Profile",
      description: "Update your profile information, avatar, and details",
      icon: <User className="w-8 h-8 text-[#CD000E]" />,
      path: "/settings/profile",
      disabled: false,
    },
    {
      title: "Account Information",
      description: "Manage your login, password, and security options",
      icon: <SettingsIcon className="w-8 h-8 text-[#CD000E]" />,
      path: "/settings/account",
      disabled: false,
    },
    {
      title: getCreatorButtonLabel(),
      description:
        creatorStatus === "LOADING"
          ? "Checking creator status…"
          : creatorStatus === EntityStatus.PENDING
          ? "Your application is under review."
          : creatorStatus === EntityStatus.APPROVED
          ? "Access creator tools and manage your public profile"
          : creatorStatus === EntityStatus.REJECTED
          ? "Your previous application was rejected. You can reapply."
          : "Apply to become a creator and unlock advanced features",
      icon: <Sparkles className="w-8 h-8 text-[#CD000E]" />,
      path: "/settings/creator",
      disabled: creatorStatus === EntityStatus.PENDING,
      onClick: handleCreatorClick,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white uppercase tracking-tight mb-2">
          Settings
        </h1>
        <p className="text-gray-400 font-body">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <div
            key={card.title}
            onClick={
              card.disabled
                ? undefined
                : card.onClick
                ? card.onClick
                : () => navigate(card.path)
            }
            className={`bg-gradient-to-r from-[#CD000E]/20 to-[#860005]/20 border border-[#CD000E]/40 rounded-lg shadow-lg p-6 transition-all duration-300 hover:shadow-xl hover:scale-[1.02] cursor-pointer
              ${card.disabled ? "opacity-50 cursor-not-allowed hover:scale-100" : ""}`}
          >
            <div className="mb-4">{card.icon}</div>
            <h3 className="text-xl font-heading font-semibold text-white mb-1 uppercase">
              {card.title}
            </h3>
            <p className="text-gray-400 text-sm font-body">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
