// Authentication hooks
export { useAuth } from "./useAuth";

// User hooks
export {
  useUsers,
  useUser,
  useUserByUsername,
  useUserEntities,
  useCreateUserProfile,
  useUpdateUserProfile,
  useUpgradeToCreator,
  useDeleteUser,
} from "./useUsers";

// Entity hooks
export {
  useEntities,
  useEntity,
  useEntityBySlug,
  useCreateEntity,
  useUpdateEntity,
  useDeleteEntity,
  useEntityCollaborators,
  useAddCollaborator,
  useRemoveCollaborator,
} from "./useEntities";

// Event hooks
export {
  useEvents,
  useEvent,
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  useTransitionEventPhase,
  useExtendEventPhase,
  useEventMetrics,
  useUpdateEventMetrics,
  useLogTestResults,
} from "./useEvents";

// Follow hooks
export {
  useFollowers,
  useFollowing,
  useIsFollowing,
  useFollowEntity,
  useUnfollowEntity,
} from "./useFollow";

// Store hooks
export {
  useStores,
  useStore,
  useStoreByEntity,
  useCreateStore,
  useUpdateStore,
  useDeleteStore,
  useAddProduct,
  useUpdateProduct,
  useDeleteProduct,
} from "./useStore";

// Notification hooks
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useClearNotifications,
  useNotificationsSocket,
} from "./useNotifications";

// Analytics hooks
export {
  useEntityAnalytics,
  useEventPerformance,
  useUserEngagement,
  usePlatformOverview,
  useRecommendations,
} from "./useAnalytics";

// Payment hooks
export { useOrders, useOrder, useCreateCheckout, useCreateRefund } from "./usePayments";

// Entity context hooks
export { useEntityContext } from "./useEntityContext";
export { useConvertToEntity } from "./useConvertToEntity";

// Asset hooks
export {
  useAssets,
  useAsset,
  useAssetUrl,
  useUploadAsset,
  useDeleteAsset,
} from "./useAssets";

// Post hooks
export {
  usePosts,
  usePost,
  useCreatePost,
  useUpdatePost,
  useDeletePost,
} from "./usePosts";

// Fan hooks
export { useManageFan } from "./useFans";

// Utility hooks
export { useDebounce } from "./useDebounce";
export { useLocalStorage } from "./useLocalStorage";

