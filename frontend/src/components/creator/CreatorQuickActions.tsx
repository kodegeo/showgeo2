import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ShoppingBag,
  BarChart3,
  Video,
  FileText,
  UploadCloud,
  UserCog,
} from "lucide-react";
import { useModalContext } from "@/state/creator/modalContext";

interface QuickAction {
  label: string;
  icon: React.ReactNode;
  type: "modal" | "link";
  action?: () => void;
  path?: string;
  description: string;
  disabled?: boolean;
}

export function CreatorQuickActions() {
  const { openModal } = useModalContext();
  const navigate = useNavigate();

  const quickActions: QuickAction[] = [
    {
      label: "Create Event",
      icon: <Calendar className="w-5 h-5" />,
      type: "modal",
      action: () => openModal("createEvent"),
      description: "Schedule a new event",
    },
    {
      label: "Manage Store",
      icon: <ShoppingBag className="w-5 h-5" />,
      type: "link",
      path: "/creator/store",
      description: "View products and sales",
    },
    {
      label: "View Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
      type: "link",
      path: "/creator/analytics",
      description: "Track performance",
    },
    {
      label: "Start Stream",
      icon: <Video className="w-5 h-5" />,
      type: "modal",
      action: () => openModal("startStream"),
      description: "Go live now",
    },
    {
      label: "Manage Posts",
      icon: <FileText className="w-5 h-5" />,
      type: "modal",
      action: () => openModal("createPost"),
      description: "Create content",
    },
    {
      label: "Upload Media",
      icon: <UploadCloud className="w-5 h-5" />,
      type: "modal",
      action: () => openModal("uploadMedia"),
      description: "Upload images, videos, or audio",
    },
    {
      label: "Edit Profile",
      icon: <UserCog className="w-5 h-5" />,
      type: "link",
      path: "/profile/setup",
      description: "Edit creator profile",
    },
  ];

  const handleClick = (action: QuickAction) => {
    if (action.type === "modal" && action.action) {
      action.action();
    } else if (action.type === "link" && action.path) {
      navigate(action.path);
    }
  };

  const baseClasses = `
    flex items-center gap-2 px-4 py-2 rounded-lg
    border border-gray-700 hover:border-[#CD000E]
    text-white font-body text-sm
    transition-all duration-300
    hover:bg-gray-800/50 hover:shadow-lg hover:shadow-[#CD000E]/10
    group
    relative overflow-hidden
  `;

  const renderContent = (action: QuickAction) => (
    <>
      {/* Hover sweep */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#CD000E]/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />

      <span className="text-[#CD000E] relative z-10">{action.icon}</span>

      <span className="font-semibold uppercase tracking-wider text-xs relative z-10">
        {action.label}
      </span>
    </>
  );

  return (
    <div className="bg-[#0B0B0B] border-b border-gray-800 px-4 sm:px-6 lg:px-8 py-4 backdrop-blur-sm">
      <div className="flex flex-wrap items-center gap-3">
        {quickActions.map((action, index) => {
          const isDisabled = action.disabled;

          if (action.type === "link" && action.path) {
            return (
              <Link
                key={index}
                to={action.path}
                onClick={() => handleClick(action)}
                className={`${baseClasses} ${
                  isDisabled ? "opacity-50 pointer-events-none" : "cursor-pointer"
                }`}
                title={action.description}
                aria-label={action.label}
              >
                {renderContent(action)}
              </Link>
            );
          }

          return (
            <button
              key={index}
              type="button"
              onClick={() => handleClick(action)}
              disabled={isDisabled}
              className={`${baseClasses} ${
                isDisabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              }`}
              title={action.description}
              aria-label={action.label}
            >
              {renderContent(action)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
