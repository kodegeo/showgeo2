import { useState } from "react";
import { useEntityContext } from "@/hooks/useEntityContext";
import { useUserEntities } from "@/hooks/useUsers";
import { useAuth } from "@/hooks/useAuth";

interface EntityContextSwitchProps {
  className?: string;
}

export function EntityContextSwitch({ className }: EntityContextSwitchProps) {
  const { user } = useAuth();
  const { currentEntity, switchToEntity, switchToUser } = useEntityContext();
  const { data: entitiesData, isLoading } = useUserEntities(user?.id || "");

  const [isOpen, setIsOpen] = useState(false);

  if (!user || isLoading) {
    return null;
  }

  const allEntities = [
    ...(entitiesData?.owned || []),
    ...(entitiesData?.managed || []),
  ];

  const handleSwitch = async (entityId: string) => {
    try {
      await switchToEntity(entityId);
      setIsOpen(false);
    } catch (error) {
      console.error("Failed to switch entity:", error);
    }
  };

  return (
    <div className={`relative ${className || ""}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
      >
        {currentEntity ? (
          <>
            <span className="font-medium">{currentEntity.name}</span>
            <span className="text-xs text-gray-500">(Entity)</span>
          </>
        ) : (
          <>
            <span className="font-medium">{user.profile?.firstName || user.email}</span>
            <span className="text-xs text-gray-500">(User)</span>
          </>
        )}
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg z-20">
            <div className="p-2">
              {/* User option */}
              <button
                onClick={() => {
                  switchToUser();
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                  !currentEntity ? "bg-blue-50 dark:bg-blue-900/20" : ""
                }`}
              >
                <div className="font-medium">{user.profile?.firstName || user.email}</div>
                <div className="text-xs text-gray-500">User Account</div>
              </button>

              {/* Divider */}
              {allEntities.length > 0 && (
                <>
                  <div className="my-2 border-t border-gray-200 dark:border-gray-700" />
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 uppercase">
                    Entities
                  </div>
                </>
              )}

              {/* Entity options */}
              {allEntities.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No entities available
                </div>
              ) : (
                allEntities.map((entity) => (
                  <button
                    key={entity.id}
                    onClick={() => handleSwitch(entity.id)}
                    className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                      currentEntity?.id === entity.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                    }`}
                  >
                    <div className="font-medium">{entity.name}</div>
                    <div className="text-xs text-gray-500">
                      {entity.type === "INDIVIDUAL" ? "Individual" : "Organization"}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

