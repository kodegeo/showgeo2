// Base API client
export { apiClient, handleApiError } from "./api";

// Type definitions
export type * from "./types";

// Service exports
export { authService } from "./auth.service";
export { usersService } from "./users.service";
export { entitiesService } from "./entities.service";
export { eventsService } from "./events.service";
export { followService } from "./follow.service";
export { storeService } from "./store.service";
export { streamingService } from "./streaming.service";
export { notificationsService } from "./notifications.service";
export { analyticsService } from "./analytics.service";
export { assetsService } from "./assets.service";
export { postsService } from "./posts.service";
export { fansService } from "./fans.service";
export { paymentsService} from "./payments.service";

// Re-export request/response types
export type {
  RefreshTokenRequest,
  QueryParams,
  PaginatedResponse,
  ApiError,
} from "./types";

// Re-export auth types from auth.service (Supabase-based)
export type {
  RegisterRequest,
  LoginRequest,
} from "./auth.service";

export type {
  CreateUserProfileRequest,
  UpdateUserProfileRequest,
  ConvertToEntityRequest,
  UserEntitiesResponse,
} from "./users.service";

export type {
  CreateEntityRequest,
  UpdateEntityRequest,
  AddCollaboratorRequest,
} from "./entities.service";

export type {
  CreateEventRequest,
  UpdateEventRequest,
  PhaseTransitionRequest,
  UpdateMetricsRequest,
  TestResultsRequest,
} from "./events.service";

export type { Follower, Following } from "./follow.service";

export type {
  CreateStoreRequest,
  UpdateStoreRequest,
  CreateProductRequest,
  UpdateProductRequest,
} from "./store.service";

export type {
  CreateSessionRequest,
  GenerateTokenRequest,
  StreamingSession,
  LivekitTokenResponse,
  UpdateMetricsRequest as UpdateStreamingMetricsRequest,
} from "./streaming.service";

export type { Notification, NotificationResponse } from "./notifications.service";

export type {
  EntityMetrics,
  EventPerformance,
  UserEngagement,
  PlatformOverview,
  Recommendations,
} from "./analytics.service";

export type {
  UploadAssetRequest,
  AssetQueryParams,
} from "./assets.service";

export type {
  Post,
  CreatePostRequest,
  UpdatePostRequest,
} from "./posts.service";

export type {
  Fan,
  ManageFanRequest,
} from "./fans.service";

export { creatorService } from "./creator/creator.service";
export type {
  CreateEventWithThumbnailRequest,
  CreatePostWithMediaRequest,
  CreateProductWithImageRequest,
  StartStreamRequest,
  UploadMediaRequest,
} from "./creator/creator.service";

// type-only exports
export type {
  CreateCheckoutRequest,
  CreateRefundRequest,
  GetOrdersParams,
} from "../../../packages/shared/types/payments.types";

