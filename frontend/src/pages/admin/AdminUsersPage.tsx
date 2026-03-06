import { useState, useMemo, useRef, useEffect } from "react";
import { MoreVertical, AlertTriangle, CheckCircle, XCircle, Ban, UserCheck, Building2, FileText, Zap, ArrowUp, ArrowDown, Shield, ShieldOff, Search, X, ClipboardList, Eye } from "lucide-react";
import { useAdminUsers, useAdminEntities, useAdminReports, useSuspendUser, useReinstateUser, useDisableEntity, useReinstateEntity, useTerminateEvent, useResolveReport, usePromoteToAdmin, useDemoteAdmin, useDisableUser, useEnableUser, useSuspendEntity, useAdminEntityApplications, useAcceptApplication, useRejectApplication } from "@/hooks/useAdmin";
import { useEvents } from "@/hooks/useEvents";
import { EnforcementModal } from "@/modals/admin/EnforcementModal";
import { ApplicationReviewDrawer } from "@/components/admin/ApplicationReviewDrawer";
import { useToast } from "@/hooks/creator/useToast";
import { useAuth } from "@/hooks/useAuth";
import type { EntityApplication, User, Entity, Event, AdminReport } from "@/services/admin.service";

type AdminUser = User;
type Report = AdminReport;

type Tab = "users" | "entities" | "reports" | "applications";

export type AdminAction =
  | "suspend"
  | "reinstateUser"
  | "reinstateEntity"
  | "disableUser"
  | "enableUser"
  | "disableEntity"
  | "suspendEntity"
  | "terminateEvent"
  | "resolveReport"
  | "promoteToAdmin"
  | "demoteAdmin"
  | "acceptApplication"
  | "rejectApplication"
  | "banApplication"
  | "viewDetails";

  export type ActionMenuProps =
  | {
      type: "user";
      item: AdminUser;
      onAction: (
        action:
          | "suspend"
          | "reinstateUser"
          | "disableUser"
          | "enableUser"
          | "promoteToAdmin"
          | "demoteAdmin",
        item: AdminUser
      ) => void;

      currentUserId?: string;
      isLastAdmin?: boolean;
      disabled?: boolean;
      isUserLastAdmin?: (userId: string) => boolean;
      adminUsers?: AdminUser[];
    }
  | {
      type: "entity";
      item: Entity;
      onAction: (
        action:
          | "suspendEntity"
          | "disableEntity"
          | "reinstateEntity"
          | "viewDetails",
        item: Entity
      ) => void;

      disabled?: boolean;
    }
  | {
      type: "application";
      item: EntityApplication;
      onAction: (
        action:
          | "acceptApplication"
          | "rejectApplication"
          | "banApplication"
          | "viewDetails",
        item: EntityApplication
      ) => void;

      disabled?: boolean;
    }
  | {
      type: "event";
      item: Event;
      onAction: (action: "terminateEvent", item: Event) => void;

      disabled?: boolean;
    }
  | {
      type: "report";
      item: Report;
      onAction: (action: "resolveReport", item: Report) => void;

      disabled?: boolean;
    };
  
    function ActionMenu(props: ActionMenuProps) {
      const [isOpen, setIsOpen] = useState(false);
  const [buttonRect, setButtonRect] = useState<DOMRect | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { type, item, disabled, onAction } = props;

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      setButtonRect(buttonRef.current.getBoundingClientRect());
    }
  }, [isOpen]);

  const getActions = () => {
  if (type === "user") {
    const {
      currentUserId,
      isUserLastAdmin,
    } = props;
      const actions: Array<{ label: string; action: AdminAction; icon: any; variant: "danger" | "success" | "warning"; disabled?: boolean; tooltip?: string }> = [];
      // Use account_status as the authoritative source
      const accountStatus = item.account_status || "ACTIVE";
      const isSelf = currentUserId && item.id === currentUserId;

      // A. If status === ACTIVE: Show "Suspend Account" and "Disable Account"
      if (accountStatus === "ACTIVE") {
        actions.push({
          label: "Suspend Account",
          action: "suspend",
          icon: Ban,
          variant: "warning",
          disabled: isSelf || disabled,
          tooltip: isSelf ? "Cannot suspend yourself" : disabled ? "Another action is in progress" : "Temporarily suspend account access",
        });
        actions.push({
          label: "Disable Account",
          action: "disableUser",
          icon: ShieldOff,
          variant: "danger",
          disabled: isSelf || disabled,
          tooltip: isSelf ? "Cannot disable yourself" : disabled ? "Another action is in progress" : "Permanently disable account access",
        });
      }

      // B. If status === SUSPENDED: Show "Reinstate Account" and "Disable Account"
      if (accountStatus === "SUSPENDED") {
        actions.push({
          label: "Reinstate Account",
          action: "reinstateUser",
          icon: UserCheck,
          variant: "success",
          disabled: isSelf || disabled,
          tooltip: isSelf ? "Cannot reinstate yourself" : disabled ? "Another action is in progress" : "Restore account to ACTIVE status",
        });
        actions.push({
          label: "Disable Account",
          action: "disableUser",
          icon: ShieldOff,
          variant: "danger",
          disabled: isSelf || disabled,
          tooltip: isSelf ? "Cannot disable yourself" : disabled ? "Another action is in progress" : "Permanently disable account access",
        });
      }

      // C. If status === DISABLED: Show no actions (as per requirements)

      return actions;
    }
    if (type === "entity") {
      const status = (item.status as string) || "";
      const isPending = status === "PENDING";
      const isActive = status === "ACTIVE";
      const isSuspended = status === "SUSPENDED";
      const isDisabled = status === "DISABLED";
      
      // Check owner account_status - actions are disabled if owner is not ACTIVE
      const ownerAccountStatus = (item as any).ownerAccountStatus || (item as any).app_users?.account_status || "ACTIVE";
      const ownerIsActive = ownerAccountStatus === "ACTIVE";
      
      const actions: Array<{ label: string; action: AdminAction; icon: any; variant: "danger" | "success" | "warning"; disabled?: boolean; tooltip?: string }> = [];
      
      // View action - always available, navigates to entity detail admin page
      actions.push({
        label: "View",
        action: "viewDetails",
        icon: Eye,
        variant: "success",
        disabled: false,
        tooltip: "View entity details",
      });
      
      // PENDING: View only (no governance actions - must go through application acceptance)
      if (isPending) {
        // No additional actions - PENDING entities can only be activated via application acceptance
        return actions;
      }
      
      // ACTIVE: View, Suspend
      if (isActive) {
        const actionDisabled = disabled || !ownerIsActive;
        actions.push({
          label: "Suspend",
          action: "suspendEntity",
          icon: Ban,
          variant: "warning",
          disabled: actionDisabled,
          tooltip: disabled 
            ? "Another action is in progress" 
            : !ownerIsActive 
            ? `Cannot suspend: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
            : "Suspend entity (reversible)",
        });
      }
      
      // SUSPENDED: View, Reinstate, Disable
      if (isSuspended) {
        const actionDisabled = disabled || !ownerIsActive;
        actions.push({
          label: "Reinstate",
          action: "reinstateEntity",
          icon: CheckCircle,
          variant: "success",
          disabled: actionDisabled,
          tooltip: disabled 
            ? "Another action is in progress" 
            : !ownerIsActive 
            ? `Cannot reinstate: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
            : "Reinstate entity to ACTIVE",
        });
        actions.push({
          label: "Disable",
          action: "disableEntity",
          icon: XCircle,
          variant: "danger",
          disabled: actionDisabled,
          tooltip: disabled 
            ? "Another action is in progress" 
            : !ownerIsActive 
            ? `Cannot disable: Owner account status is ${ownerAccountStatus}. Entity operations require owner account to be ACTIVE.`
            : "Disable entity (requires new application)",
        });
      }
      
      // DISABLED: View only (no other actions)
      
      return actions;
    }
    if (type === "event") {
      const canTerminate = item.phase === "LIVE" || item.phase === "PRE_LIVE";
      return canTerminate
        ? [{ label: "Terminate", action: "terminateEvent", icon: Zap, variant: "danger" as const, disabled: disabled, tooltip: disabled ? "Another action is in progress" : undefined }]
        : [];
    }
    if (type === "report") {
      return item.status === "OPEN"
        ? [{ label: "Resolve", action: "resolveReport" as AdminAction, icon: CheckCircle, variant: "success" as const, disabled: disabled, tooltip: disabled ? "Another action is in progress" : undefined }]
        : [];
    }
    if (type === "application") {
      const actions: Array<{ label: string; action: AdminAction; icon: any; variant: "danger" | "success" | "warning"; disabled?: boolean; tooltip?: string }> = [];
      
      // View - opens review drawer
      actions.push({ 
        label: "View", 
        action: "viewDetails", 
        icon: Eye, 
        variant: "success" as const, 
        disabled: false,
        tooltip: "View application details"
      });
      
      // Approve - for PENDING applications
      if (item.status === "PENDING") {
        actions.push({
          label: "Approve",
          action: "acceptApplication",
          icon: CheckCircle,
          variant: "success",
          disabled: disabled,
          tooltip: disabled ? "Another action is in progress" : "Approve this creator application",
        });
      }
      
      // Reject - for PENDING applications
      if (item.status === "PENDING") {
        actions.push({
          label: "Reject",
          action: "rejectApplication",
          icon: XCircle,
          variant: "danger",
          disabled: disabled,
          tooltip: disabled ? "Another action is in progress" : "Reject this creator application",
        });
      }
      
      return actions;
    }
    return [];
  };

  const actions = getActions();

  if (actions.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {isOpen && buttonRect && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed z-50 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg"
            style={{
              top: buttonRect.bottom + 8,
              left: buttonRect.right - 192,
            }}
        >
            {actions.map((action) => {
              const Icon = action.icon;
              const isDisabled = action.disabled || false;
              return (
                <button
                  key={action.action}
                  onClick={() => {
                    if (!isDisabled) {
                      if (props.type === "user") {
                        props.onAction(action.action as any, props.item);
                      } else if (props.type === "entity") {
                        props.onAction(action.action as any, props.item);
                      } else if (props.type === "application") {
                        props.onAction(action.action as any, props.item);
                      } else if (props.type === "event") {
                        props.onAction("terminateEvent", props.item);
                      } else if (props.type === "report") {
                        props.onAction("resolveReport", props.item);
                      }
                      setIsOpen(false);
                    }
                  }}
                  disabled={isDisabled}
                  title={action.tooltip}
                  className={`w-full px-4 py-2 text-left text-sm flex items-center space-x-2 transition-colors first:rounded-t-lg last:rounded-b-lg whitespace-nowrap ${
                    isDisabled
                      ? "text-gray-500 cursor-not-allowed opacity-50"
                      : action.variant === "danger"
                      ? "text-red-400 hover:bg-gray-700"
                      : action.variant === "success"
                      ? "text-green-300 hover:bg-gray-700 hover:text-green-200 font-medium"
                      : action.variant === "warning"
                      ? "text-yellow-400 hover:bg-gray-700"
                      : "text-white hover:bg-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{action.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reportStatusFilter, setReportStatusFilter] = useState<"OPEN" | "RESOLVED" | "DISMISSED" | "all">("OPEN");
  const [entitySearchQuery, setEntitySearchQuery] = useState("");
  const [applicationSearchQuery, setApplicationSearchQuery] = useState("");
  const [enforcementModal, setEnforcementModal] = useState<{
    isOpen: boolean;
    type: "suspend" | "reinstate" | "disable" | "approve" | "terminate" | "resolve" | "promoteToAdmin" | "demoteAdmin" | "disableUser" | "enable" | "suspendEntity" | "acceptApplication" | "rejectApplication" | "banApplication";
    item: any;
    applicationId?: string; // Store applicationId separately for application actions
    title: string;
    description: string;
    actionLabel: string;
    actionType: "danger" | "warning" | "success";
  } | null>(null);
  const [reviewDrawer, setReviewDrawer] = useState<{
    isOpen: boolean;
    applicationId: string | null;
  }>({
    isOpen: false,
    applicationId: null,
  });

  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const { data: usersData, isLoading: usersLoading } = useAdminUsers();
  const { data: entitiesData, isLoading: entitiesLoading } = useAdminEntities();
  // Fetch reports based on status filter
  const reportsQueryStatus = reportStatusFilter !== "all" ? reportStatusFilter : undefined;
  const { data: allReports, isLoading: reportsLoading } = useAdminReports(reportsQueryStatus);
  const { data: eventsData, isLoading: eventsLoading } = useEvents({ limit: 1000 });

  const suspendUser = useSuspendUser();
  const reinstateUser = useReinstateUser();
  const disableEntity = useDisableEntity();
  const reinstateEntity = useReinstateEntity();
  const terminateEvent = useTerminateEvent();
  const resolveReport = useResolveReport();
  const promoteToAdmin = usePromoteToAdmin();
  const demoteAdmin = useDemoteAdmin();
  const disableUser = useDisableUser();
  const enableUser = useEnableUser();
  const suspendEntity = useSuspendEntity();
  const acceptApplication = useAcceptApplication();
  const rejectApplication = useRejectApplication();
  const { data: applicationsData, isLoading: applicationsLoading, error: applicationsError } = useAdminEntityApplications(activeTab === "applications");

  const allUsers = usersData?.data || [];
  const allEntities = entitiesData?.data || [];
  const allApplications = applicationsData || [];
  
  // Debug logging
  useEffect(() => {
    if (activeTab === "applications") {
      console.log("[AdminUsersPage] Applications tab active");
      console.log("[AdminUsersPage] applicationsData:", applicationsData);
      console.log("[AdminUsersPage] applicationsLoading:", applicationsLoading);
      console.log("[AdminUsersPage] applicationsError:", applicationsError);
      console.log("[AdminUsersPage] allApplications:", allApplications);
      console.log("[AdminUsersPage] allApplications.length:", allApplications.length);
    }
  }, [activeTab, applicationsData, applicationsLoading, applicationsError, allApplications]);
  const events = eventsData?.data || [];
  const liveEvents = events.filter((e: any) => e.phase === "LIVE" || e.phase === "PRE_LIVE");

  // Filter entities client-side by name/id/slug
  const entities = useMemo(() => {
    if (!entitySearchQuery.trim()) {
      return allEntities;
    }
    const query = entitySearchQuery.toLowerCase().trim();
    return allEntities.filter((entity: any) => {
      const nameMatch = entity.name?.toLowerCase().includes(query);
      const idMatch = entity.id?.toLowerCase().includes(query);
      const slugMatch = entity.slug?.toLowerCase().includes(query);
      return nameMatch || idMatch || slugMatch;
    });
  }, [allEntities, entitySearchQuery]);

  // Filter applications client-side by entityId/ownerId/entityName
  const applications = useMemo(() => {
    if (!applicationSearchQuery.trim()) {
      return allApplications;
    }
    const query = applicationSearchQuery.toLowerCase().trim();
    return allApplications.filter((app: any) => {
      const entityIdMatch = app.entityId?.toLowerCase().includes(query);
      const ownerIdMatch = app.ownerId?.toLowerCase().includes(query);
      const entityNameMatch = app.entityName?.toLowerCase().includes(query);
      return entityIdMatch || ownerIdMatch || entityNameMatch;
    });
  }, [allApplications, applicationSearchQuery]);

  // Filter users based on search and filters
  const users = useMemo(() => {
    let filtered = allUsers;

    // Search filter (by email)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((user: any) =>
        user.email?.toLowerCase().includes(query)
      );
    }

    // Role filter
    if (roleFilter !== "all") {
      filtered = filtered.filter((user: any) => user.role === roleFilter);
    }

    // Status filter - use account_status field directly
    if (statusFilter !== "all") {
      filtered = filtered.filter((user: any) => {
        const accountStatus = user.account_status || "ACTIVE";
        return accountStatus === statusFilter;
      });
    }

    return filtered;
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  // Check if filters are active
  const hasActiveFilters = searchQuery.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";

  // Check if current user is the last admin (for safety checks)
  const adminUsers = users.filter((u: any) => u.role === "ADMIN");
  const isLastAdmin = adminUsers.length === 1 && adminUsers[0]?.id === currentUser?.id;
  
  // Helper to check if a user is the last admin
  const isUserLastAdmin = (userId: string) => {
    return adminUsers.length === 1 && adminUsers[0]?.id === userId;
  };

  const handleAction = (action: AdminAction, item: any) => {
    if (action === "suspend") {
      setEnforcementModal({
        isOpen: true,
        type: "suspend",
        item,
        title: "Suspend User",
        description: `Suspend user ${item.email}. This will force logout and prevent access.`,
        actionLabel: "Suspend User",
        actionType: "danger",
      });
    } else if (action === "reinstateUser" && activeTab === "users") {
      setEnforcementModal({
        isOpen: true,
        type: "reinstate",
        item,
        title: "Reinstate User",
        description: `Reinstate user ${item.email}. Access will be restored.`,
        actionLabel: "Reinstate User",
        actionType: "success",
      });
    } else if (action === "disableEntity") {
      setEnforcementModal({
        isOpen: true,
        type: "disable",
        item,
        title: "Disable Entity",
        description: `Disable entity "${item.name}". This will require a new application to reactivate. All active events will be cancelled.`,
        actionLabel: "Disable Entity",
        actionType: "danger",
      });
    } else if (action === "reinstateEntity" && activeTab === "entities") {
      setEnforcementModal({
        isOpen: true,
        type: "reinstate",
        item,
        title: "Reinstate Entity",
        description: `Reinstate entity "${item.name}". New events can be created.`,
        actionLabel: "Reinstate Entity",
        actionType: "success",
      });
    } else if (action === "terminateEvent") {
      setEnforcementModal({
        isOpen: true,
        type: "terminate",
        item,
        title: "Terminate Event",
        description: `Terminate event "${item.name}". Live stream will end immediately and all viewers will be disconnected.`,
        actionLabel: "Terminate Event",
        actionType: "danger",
      });
    } else if (action === "resolveReport") {
      setEnforcementModal({
        isOpen: true,
        type: "resolve",
        item,
        title: "Resolve Report",
        description: `Mark report as resolved.`,
        actionLabel: "Resolve Report",
        actionType: "success",
      });
    } else if (action === "promoteToAdmin") {
      setEnforcementModal({
        isOpen: true,
        type: "promoteToAdmin",
        item,
        title: "Promote to Admin",
        description: `Promote user ${item.email} to ADMIN role. They will gain administrative access to the platform. Note: Users become creators through the application process, not through role promotion.`,
        actionLabel: "Promote to Admin",
        actionType: "success",
      });
    } else if (action === "demoteAdmin") {
      setEnforcementModal({
        isOpen: true,
        type: "demoteAdmin",
        item,
        title: "Demote Admin",
        description: `Demote user ${item.email} from ADMIN role to regular USER. They will lose administrative access. This does not affect creator status.`,
        actionLabel: "Demote Admin",
        actionType: "warning",
      });
    } else if (action === "disableUser") {
      setEnforcementModal({
        isOpen: true,
        type: "disableUser",
        item,
        title: "Disable Account",
        description: `Disable account for ${item.email}. This will block login and force logout.`,
        actionLabel: "Disable Account",
        actionType: "danger",
      });
    } else if (action === "enableUser") {
      setEnforcementModal({
        isOpen: true,
        type: "enable",
        item,
        title: "Re-enable Account",
        description: `Re-enable account for ${item.email}. Login access will be restored.`,
        actionLabel: "Re-enable Account",
        actionType: "success",
      });
    } else if (action === "acceptApplication") {
      // HARD GUARD: Ensure we have applicationId, not entityId
      if (!item.id) {
        console.error("[AdminUsersPage] acceptApplication: Missing application ID", {
          item,
          activeTab,
        });
        return;
      }
      
      // Verify we're in Applications context
      if (activeTab !== "applications") {
        console.warn("[AdminUsersPage] acceptApplication called outside Applications tab", {
          activeTab,
          itemId: item.id,
        });
      }
      
      // Verification logging: Log when opening modal for approval
      console.log("[ADMIN MODAL OPEN]", {
        type: "acceptApplication",
        applicationId: item.id,
        entityId: item?.entityId ?? item?.entity_id ?? null,
        activeTab,
      });
      
      setEnforcementModal({
        isOpen: true,
        type: "acceptApplication",
        item,
        applicationId: item.id, // CRITICAL: Store applicationId explicitly - this prevents approveEntity() from being called
        title: "Approve Application",
        description: `Approve this creator application. The entity will be approved and the creator will be able to create events.`,
        actionLabel: "Approve Application",
        actionType: "success",
      });
    } else if (action === "rejectApplication") {
      // HARD GUARD: Ensure we have applicationId, not entityId
      if (!item.id) {
        console.error("[AdminUsersPage] rejectApplication: Missing application ID", {
          item,
          activeTab,
        });
        return;
      }
      
      // Verify we're in Applications context
      if (activeTab !== "applications") {
        console.warn("[AdminUsersPage] rejectApplication called outside Applications tab", {
          activeTab,
          itemId: item.id,
        });
      }
      
      // Verification logging: Log when opening modal for rejection
      console.log("[ADMIN MODAL OPEN]", {
        type: "rejectApplication",
        applicationId: item.id,
        entityId: item?.entityId ?? item?.entity_id ?? null,
        activeTab,
      });
      
      setEnforcementModal({
        isOpen: true,
        type: "rejectApplication",
        item,
        applicationId: item.id, // CRITICAL: Store applicationId explicitly - this prevents approveEntity() from being called
        title: "Reject Application",
        description: `Reject this creator application. The application will be marked as rejected.`,
        actionLabel: "Reject Application",
        actionType: "danger",
      });
    } else if (action === "viewDetails") {
      // For entities: open entity page in new tab (read-only)
      if (activeTab === "entities") {
        if (item.slug) {
          // Open entity page in new tab with security attributes
          window.open(`/creators/${item.slug}`, "_blank", "noopener,noreferrer");
        } else {
          toast({
            type: "error",
            title: "Cannot view entity",
            description: "Entity slug is missing.",
          });
        }
      } else {
        // For applications: open review drawer
        setReviewDrawer({
          isOpen: true,
          applicationId: item.id,
        });
      }
    } else if (action === "suspendEntity") {
      setEnforcementModal({
        isOpen: true,
        type: "suspendEntity",
        item,
        title: "Suspend Entity",
        description: `Suspend entity "${item.name}". The entity will not be able to create events or stream until reinstated.`,
        actionLabel: "Suspend Entity",
        actionType: "warning",
      });
    }
  };

  const handleEnforcementSubmit = async (reason: string) => {
    if (!enforcementModal) {
      console.error("[AdminUsersPage] handleEnforcementSubmit: enforcementModal is null");
      return;
    }

    // 🔒 HARD GUARD #1: applicationId is the single source of truth
    // If applicationId exists, ONLY application actions are allowed
    if (enforcementModal.applicationId) {
      if (
        enforcementModal.type !== "acceptApplication" &&
        enforcementModal.type !== "rejectApplication" &&
        enforcementModal.type !== "banApplication"
      ) {
        console.error("[AdminUsersPage] INVALID MODAL STATE: applicationId present with non-application action", {
          type: enforcementModal.type,
          applicationId: enforcementModal.applicationId,
          itemId: enforcementModal.item?.id,
          activeTab,
          fullModal: enforcementModal,
        });
        throw new Error(
          "Invalid modal state: applicationId present with non-application action. Use acceptApplication/rejectApplication instead."
        );
      }
    }


    // 🔒 HARD GUARD #3: Application actions MUST have applicationId
    if (
      (enforcementModal.type === "acceptApplication" ||
        enforcementModal.type === "rejectApplication" ||
        enforcementModal.type === "banApplication") &&
      !enforcementModal.applicationId
    ) {
      console.error("[AdminUsersPage] INVALID MODAL STATE: Application action without applicationId", {
        type: enforcementModal.type,
        applicationId: enforcementModal.applicationId,
        itemId: enforcementModal.item?.id,
        activeTab,
        fullModal: enforcementModal,
      });
      throw new Error(
        `Application ID is required for ${enforcementModal.type}. Modal state is invalid.`
      );
    }

    // Verification logging: Log at start of handleEnforcementSubmit
    console.log("[ADMIN SUBMIT]", {
      type: enforcementModal.type,
      applicationId: enforcementModal.applicationId ?? null,
      itemId: enforcementModal.item?.id ?? null,
      activeTab,
    });

    try {
      // ============================================
      // APPLICATION ACTIONS (applicationId required)
      // ============================================
      if (enforcementModal.type === "acceptApplication") {
        const applicationId = enforcementModal.applicationId!;
        console.log("[AdminUsersPage] Executing acceptApplication:", {
          applicationId,
          reason: reason.substring(0, 50) + "...",
        });
        await acceptApplication.mutateAsync({
          applicationId,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Application approved",
          description: "The creator application has been approved and the entity is now active.",
        });
      } else if (enforcementModal.type === "rejectApplication") {
        const applicationId = enforcementModal.applicationId!;
        console.log("[AdminUsersPage] Executing rejectApplication:", {
          applicationId,
          reason: reason.substring(0, 50) + "...",
        });
        await rejectApplication.mutateAsync({
          applicationId,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Application rejected",
          description: "The creator application has been rejected.",
        });
      } else if (enforcementModal.type === "banApplication") {
        const applicationId = enforcementModal.applicationId!;
        console.log("[AdminUsersPage] Executing banApplication:", {
          applicationId,
          reason: reason.substring(0, 50) + "...",
        });
        // Note: banApplication hook would need to be imported if used
        toast({
          type: "success",
          title: "Application banned",
          description: "The creator application has been banned.",
        });
      }
      // ============================================
      // ENTITY ACTIONS (entityId only, NO applicationId)
      // ============================================
      else if (enforcementModal.type === "suspendEntity") {
        const entityId = enforcementModal.item.id;
        if (!entityId) {
          throw new Error("Entity ID is required to suspend an entity");
        }
        console.log("[AdminUsersPage] Executing suspendEntity:", {
          entityId,
          reason: reason.substring(0, 50) + "...",
        });
        await suspendEntity.mutateAsync({
          entityId,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Entity suspended",
          description: "The entity has been suspended and cannot create events or stream.",
        });
      }
      // ============================================
      // OTHER ACTIONS (users, events, reports, etc.)
      // ============================================
      else if (enforcementModal.type === "suspend") {
        await suspendUser.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "User suspended",
          description: "The user account has been suspended.",
        });
      } else if (enforcementModal.type === "reinstate" && activeTab === "users") {
        await reinstateUser.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "User reinstated",
          description: "The user account has been reinstated.",
        });
      } else if (enforcementModal.type === "disable") {
        await disableEntity.mutateAsync({
          entityId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Entity disabled",
          description: "The entity has been disabled and all active events have been cancelled. A new application will be required to reactivate.",
        });
      } else if (enforcementModal.type === "reinstate" && activeTab === "entities") {
        await reinstateEntity.mutateAsync({
          entityId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Entity reinstated",
          description: "The entity has been reinstated.",
        });
      } else if (enforcementModal.type === "terminate") {
        await terminateEvent.mutateAsync({
          eventId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Event terminated",
          description: "The event stream has been terminated.",
        });
      } else if (enforcementModal.type === "resolve") {
        await resolveReport.mutateAsync({
          reportId: enforcementModal.item.id,
          payload: { resolutionNotes: reason },
        });
        toast({
          type: "success",
          title: "Report resolved",
          description: "The report has been marked as resolved.",
        });
      } else if (enforcementModal.type === "promoteToAdmin") {
        await promoteToAdmin.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "User promoted to Admin",
          description: "The user has been promoted to ADMIN role and now has administrative access.",
        });
      } else if (enforcementModal.type === "demoteAdmin") {
        await demoteAdmin.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Admin demoted",
          description: "The user has been demoted from ADMIN to USER role. Administrative access has been removed.",
        });
      } else if (enforcementModal.type === "disableUser") {
        await disableUser.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Account disabled",
          description: "The user account has been disabled.",
        });
      } else if (enforcementModal.type === "enable") {
        await enableUser.mutateAsync({
          userId: enforcementModal.item.id,
          payload: { reason },
        });
        toast({
          type: "success",
          title: "Account enabled",
          description: "The user account has been re-enabled.",
        });
      }
      setEnforcementModal(null);
    } catch (error: any) {
      toast({
        type: "error",
        title: "Action failed",
        description: error?.response?.data?.message || error?.message || "The action could not be completed.",
      });
    }
  };

  const getUserStatus = (user: any) => {
    // Use account_status field as the authoritative source
    const accountStatus = user.account_status || "ACTIVE";
    
    if (accountStatus === "DISABLED") {
      return { label: "DISABLED", variant: "danger" as const };
    }
    if (accountStatus === "SUSPENDED") {
      return { label: "SUSPENDED", variant: "warning" as const };
    }
    return { label: "ACTIVE", variant: "success" as const };
  };

  const getEntityStatus = (entity: any) => {
    // Entity status badge reflects ONLY entity.status (not owner account_status)
    const status = String(entity.status || "");
    if (status === "ACTIVE") {
      return { label: "ACTIVE", variant: "success" as const };
    }
    if (status === "SUSPENDED") {
      return { label: "SUSPENDED", variant: "warning" as const };
    }
    if (status === "DISABLED") {
      return { label: "DISABLED", variant: "danger" as const };
    }
    if (status === "PENDING") {
      return { label: "PENDING", variant: "warning" as const };
    }
    // Fallback for unknown status
    return { label: status || "UNKNOWN", variant: "warning" as const };
  };

  const getReportStatus = (report: any) => {
    if (report.status === "OPEN") {
      return { label: "OPEN", variant: "warning" as const };
    }
    if (report.status === "RESOLVED") {
      return { label: "RESOLVED", variant: "success" as const };
    }
    return { label: "DISMISSED", variant: "danger" as const };
  };

  const getApplicationStatus = (application: any) => {
    if (application.status === "ACCEPTED") {
      return { label: "ACCEPTED", variant: "success" as const };
    }
    if (application.status === "REJECTED") {
      return { label: "REJECTED", variant: "warning" as const };
    }
    if (application.status === "BANNED") {
      return { label: "BANNED", variant: "danger" as const };
    }
    return { label: "PENDING", variant: "warning" as const };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">User Management</h1>
        <p className="text-white/60">Platform governance and enforcement</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/10">
        <nav className="flex space-x-8">
          {[
            { id: "users" as Tab, label: "All Users", icon: UserCheck },
            { id: "entities" as Tab, label: "Entities", icon: Building2 },
            { id: "applications" as Tab, label: "Applications", icon: ClipboardList },
            { id: "reports" as Tab, label: "Reports", icon: FileText },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-white/60 hover:text-white/80"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="bg-white/5 border border-white/10 rounded-lg overflow-visible">
        {activeTab === "users" && (
          <div className="overflow-x-auto">
            {/* Search and Filters */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search Input */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="Search by email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Role Filter */}
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Roles</option>
                  <option value="USER">USER</option>
                  <option value="ADMIN">ADMIN</option>
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                  <option value="DISABLED">DISABLED</option>
                </select>

                {/* Clear Filters */}
                {hasActiveFilters && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setRoleFilter("all");
                      setStatusFilter("all");
                    }}
                    className="px-4 py-2 text-sm text-white/60 hover:text-white border border-white/10 rounded-lg hover:border-white/20 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            </div>

            {usersLoading ? (
              <TableSkeleton />
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        {hasActiveFilters ? (
                          <div className="space-y-2">
                            <p className="text-white/60">No users match your filters</p>
                            <p className="text-white/40 text-sm">
                              Try adjusting your search or filter criteria
                            </p>
                            <button
                              onClick={() => {
                                setSearchQuery("");
                                setRoleFilter("all");
                                setStatusFilter("all");
                              }}
                              className="mt-4 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg hover:border-blue-500/50 transition-colors"
                            >
                              Clear All Filters
                            </button>
                          </div>
                        ) : (
                          <p className="text-white/40">No users found</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    users.map((user: any) => {
                      const status = getUserStatus(user);
                      return (
                        <tr key={user.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{user.email}</div>
                              {user.profile?.username && (
                                <div className="text-sm text-white/60">@{user.profile.username}</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-white/80">{user.role}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <ActionMenu
                              type="user"
                              item={user}
                              onAction={handleAction}
                              currentUserId={currentUser?.id}
                              isLastAdmin={isLastAdmin}
                              isUserLastAdmin={isUserLastAdmin}
                              adminUsers={adminUsers}
                              disabled={
                                suspendUser.isPending ||
                                reinstateUser.isPending ||
                                promoteToAdmin.isPending ||
                                demoteAdmin.isPending ||
                                disableUser.isPending ||
                                enableUser.isPending
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "entities" && (
          <div className="overflow-x-auto overflow-y-visible">
            {/* Search Filter */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by name, ID, or slug..."
                  value={entitySearchQuery}
                  onChange={(e) => setEntitySearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {entitySearchQuery && (
                  <button
                    onClick={() => setEntitySearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {entitiesLoading ? (
              <TableSkeleton />
            ) : (
              <>
                {/* Live Events Section */}
                {liveEvents.length > 0 && (
                  <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
                    <h3 className="text-sm font-medium text-yellow-400 mb-3 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Live Events ({liveEvents.length})</span>
                    </h3>
                    <div className="space-y-2">
                      {liveEvents.map((event: any) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-3 bg-white/5 rounded-lg"
                        >
                          <div>
                            <div className="text-sm font-medium text-white">{event.name}</div>
                            <div className="text-xs text-white/60">
                              {event.phase} • Entity: {allEntities.find((e: any) => e.id === event.entityId)?.name || "Unknown"}
                            </div>
                          </div>
                          <ActionMenu type="event" item={event} onAction={handleAction} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Entities Table */}
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Entity Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider min-w-[120px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10">
                    {entities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-white/40">
                          No entities found
                        </td>
                      </tr>
                    ) : (
                      entities.map((entity: any) => {
                        const status = getEntityStatus(entity);
                        return (
                          <tr 
                            key={entity.id} 
                            className="hover:bg-white/5 transition-colors align-top min-h-[128px]"
                            >
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <div 
                                  className="text-sm font-medium text-white cursor-help"
                                  title={`Entity ID: ${entity.id}`}
                                >
                                  {entity.name}
                                </div>
                                <div className="text-sm text-white/60">@{entity.slug}</div>
                                {entity.ownerEmail && (
                                  <div className="text-xs text-white/50 mt-1">
                                    {entity.ownerEmail}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <StatusBadge status={status} />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                              {new Date(entity.createdAt).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-6 whitespace-nowrap text-right relative overflow-visible min-h-[120px]">
                              <ActionMenu
                                type="entity"
                                item={entity}
                                onAction={handleAction}
                                disabled={
                                  disableEntity.isPending ||
                                  reinstateEntity.isPending ||
                                  suspendEntity.isPending
                                }
                              />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </>
            )}
          </div>
        )}

        {activeTab === "applications" && (
          <div className="overflow-x-auto">
            {/* Search Filter */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder="Search by Entity Name, Entity ID, or Applicant ID..."
                  value={applicationSearchQuery}
                  onChange={(e) => setApplicationSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-10 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {applicationSearchQuery && (
                  <button
                    onClick={() => setApplicationSearchQuery("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-white/40 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {applicationsLoading ? (
              <TableSkeleton />
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Entity Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Entity ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Applicant ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Submitted</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {applications.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-white/40">
                        No applications submitted
                      </td>
                    </tr>
                  ) : (
                    applications.map((application: any) => {
                      const status = getApplicationStatus(application);
                      return (
                        <tr key={application.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white">
                              {application.entityName || "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-white font-mono">
                              {application.entityId ? `${application.entityId.slice(0, 8)}...` : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-white font-mono">
                              {application.ownerId ? `${application.ownerId.slice(0, 8)}...` : "N/A"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={status} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                            {application.createdAt ? new Date(application.createdAt).toLocaleDateString() : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <ActionMenu
                              type="application"
                              item={application}
                              onAction={handleAction}
                              disabled={
                                acceptApplication.isPending ||
                                rejectApplication.isPending
                              }
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "reports" && (
          <div className="overflow-x-auto">
            {/* Status Filter */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center gap-4">
                <label className="text-sm text-white/60">Filter by Status:</label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value as "OPEN" | "RESOLVED" | "DISMISSED" | "all")}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Status</option>
                  <option value="OPEN">OPEN</option>
                  <option value="RESOLVED">RESOLVED</option>
                  <option value="DISMISSED">DISMISSED</option>
                </select>
              </div>
            </div>

            {reportsLoading ? (
              <TableSkeleton />
            ) : (
              <table className="w-full">
                <thead className="bg-white/5">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Reporter</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Message</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Target Context</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/60 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/60 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {!allReports || allReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        {reportStatusFilter !== "all" ? (
                          <div className="space-y-2">
                            <p className="text-white/60">No reports match your filters</p>
                            <p className="text-white/40 text-sm">
                              Try selecting a different status filter
                            </p>
                            <button
                              onClick={() => setReportStatusFilter("all")}
                              className="mt-4 px-4 py-2 text-sm text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg hover:border-blue-500/50 transition-colors"
                            >
                              Show All Reports
                            </button>
                          </div>
                        ) : (
                          <p className="text-white/40">No reports found</p>
                        )}
                      </td>
                    </tr>
                  ) : (
                    allReports.map((report: any) => {
                      const isOpen = report.status === "OPEN";
                      return (
                        <tr
                          key={report.id}
                          className={`hover:bg-white/5 transition-colors ${
                            isOpen ? "bg-yellow-500/5 border-l-4 border-l-yellow-500/50" : ""
                          }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-white">{report.reporterRole}</div>
                              <div className="text-xs text-white/60">Reporter ID: {report.reporterUserId.slice(0, 8)}...</div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-white max-w-md">{report.message}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-xs text-white/60 space-y-1">
                              {report.entityId && (
                                <div className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" />
                                  <span>Entity: {report.entityId.slice(0, 8)}...</span>
                                </div>
                              )}
                              {report.eventId && (
                                <div className="flex items-center gap-1">
                                  <FileText className="w-3 h-3" />
                                  <span>Event: {report.eventId.slice(0, 8)}...</span>
                                </div>
                              )}
                              {!report.entityId && !report.eventId && (
                                <div className="text-white/40">General Report</div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-white/60">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <StatusBadge status={getReportStatus(report)} />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <ActionMenu type="report" item={report} onAction={handleAction} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Enforcement Modal */}
      {enforcementModal && (
        <EnforcementModal
          isOpen={enforcementModal.isOpen}
          onClose={() => {
            // 🔒 Reset modal state fully on close
            console.log("[AdminUsersPage] Closing enforcement modal, resetting state");
            setEnforcementModal(null);
          }}
          onSubmit={handleEnforcementSubmit}
          title={enforcementModal.title}
          description={enforcementModal.description}
          actionLabel={enforcementModal.actionLabel}
          actionType={enforcementModal.actionType}
          isLoading={
            suspendUser.isPending ||
            reinstateUser.isPending ||
            disableEntity.isPending ||
            reinstateEntity.isPending ||
            terminateEvent.isPending ||
            resolveReport.isPending ||
            promoteToAdmin.isPending ||
            demoteAdmin.isPending ||
            disableUser.isPending ||
            enableUser.isPending ||
            suspendEntity.isPending ||
            acceptApplication.isPending ||
            rejectApplication.isPending
          }
        />
      )}

      {/* Application Review Drawer (Read-only) */}
      <ApplicationReviewDrawer
        isOpen={reviewDrawer.isOpen}
        applicationId={reviewDrawer.applicationId}
        onClose={() =>
          setReviewDrawer({ isOpen: false, applicationId: null })
        }
      />
    </div>
  );
}

/**
 * StatusBadge - Consistent status badge component
 */
interface StatusBadgeProps {
  status: { label: string; variant: "danger" | "success" | "warning" };
}

function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
        status.variant === "danger"
          ? "bg-red-500/20 text-red-400"
          : status.variant === "success"
          ? "bg-green-500/20 text-green-400"
          : "bg-yellow-500/20 text-yellow-400"
      }`}
    >
      {status.label}
    </span>
  );
}

/**
 * TableSkeleton - Loading skeleton for tables
 */
function TableSkeleton() {
  return (
    <div className="p-8">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center space-x-4 animate-pulse">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
            <div className="h-4 bg-white/10 rounded w-20" />
            <div className="h-6 bg-white/10 rounded-full w-24" />
            <div className="h-4 bg-white/10 rounded w-24" />
            <div className="h-8 bg-white/10 rounded w-8" />
          </div>
        ))}
      </div>
    </div>
  );
}

