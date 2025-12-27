/**
 * API Client Generator
 * 
 * This file contains the complete type-safe API client definitions
 * for all backend endpoints. This is a reference/registry that can be
 * used to verify all endpoints are covered and generate client code.
 * 
 * All actual implementations are in their respective service files.
 */

import type { PaginatedResponse, QueryParams } from "./types";
import type {
  User,
  UserProfile,
  Entity,
  Event,
  Store,
  Product,
  Asset,
} from "../../../packages/shared/types";

// ============================================================================
// Auth Endpoints
// ============================================================================

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: User & { profile?: UserProfile };
}

export interface AuthEndpoints {
  register: (data: RegisterRequest) => Promise<AuthResponse>;
  login: (data: LoginRequest) => Promise<AuthResponse>;
  refresh: (data: RefreshTokenRequest) => Promise<AuthResponse>;
  getCurrentUser: () => Promise<User & { profile?: UserProfile }>;
}

// ============================================================================
// Users Endpoints
// ============================================================================

export interface CreateUserProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  website?: string;
}

export interface UpdateUserProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  bio?: string;
  avatarUrl?: string;
  location?: string;
  timezone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  preferences?: Record<string, unknown>;
  visibility?: "public" | "private";
}

export interface ConvertToEntityRequest {
  name: string;
  slug: string;
  type: "INDIVIDUAL" | "ORGANIZATION";
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic?: boolean;
}

export interface UserEntitiesResponse {
  owned: Array<{ id: string; name: string; slug: string; type: string }>;
  managed: Array<{ id: string; name: string; slug: string; type: string; role: string }>;
  followed: Array<{ id: string; name: string; slug: string; type: string }>;
}

export interface UsersEndpoints {
  getAll: (params?: QueryParams) => Promise<PaginatedResponse<User & { profile?: UserProfile }>>;
  getById: (id: string) => Promise<User & { profile?: UserProfile }>;
  getByUsername: (username: string) => Promise<User & { profile?: UserProfile }>;
  createProfile: (userId: string, data: CreateUserProfileRequest) => Promise<UserProfile>;
  updateProfile: (id: string, data: UpdateUserProfileRequest) => Promise<User & { profile?: UserProfile }>;
  delete: (id: string) => Promise<void>;
  getEntities: (id: string) => Promise<UserEntitiesResponse>;
  convertToEntity: (userId: string, data: ConvertToEntityRequest) => Promise<Entity>;
}

// ============================================================================
// Entities Endpoints
// ============================================================================

export interface CreateEntityRequest {
  type: "INDIVIDUAL" | "ORGANIZATION";
  name: string;
  slug: string;
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic: boolean;
  defaultCoordinatorId?: string;
}

export interface UpdateEntityRequest {
  name?: string;
  slug?: string;
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic?: boolean;
  defaultCoordinatorId?: string;
}

export interface AddCollaboratorRequest {
  userId: string;
  role: "ADMIN" | "MANAGER" | "COORDINATOR";
}

export interface EntityQueryParams extends QueryParams {
  type?: "INDIVIDUAL" | "ORGANIZATION";
  isVerified?: boolean;
  isPublic?: boolean;
  search?: string;
}

export interface EntitiesEndpoints {
  create: (data: CreateEntityRequest) => Promise<Entity>;
  getAll: (params?: EntityQueryParams) => Promise<PaginatedResponse<Entity>>;
  getById: (id: string) => Promise<Entity>;
  getBySlug: (slug: string) => Promise<Entity>;
  update: (id: string, data: UpdateEntityRequest) => Promise<Entity>;
  delete: (id: string) => Promise<void>;
  addCollaborator: (id: string, data: AddCollaboratorRequest) => Promise<void>;
  removeCollaborator: (id: string, userId: string) => Promise<void>;
  getCollaborators: (id: string) => Promise<Array<{ id: string; userId: string; role: string }>>;
}

// ============================================================================
// Events Endpoints
// ============================================================================

export interface CreateEventRequest {
  entityId: string;
  name: string;
  description?: string;
  thumbnail?: string;
  eventType: "LIVE" | "PRERECORDED";
  startTime: string;
  endTime?: string;
  location?: string;
  phase?: "PRE_LIVE" | "LIVE" | "POST_LIVE";
  status?: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  tourId?: string;
  collaboratorEntityIds?: string[];
  isVirtual?: boolean;
  streamUrl?: string;
  videoUrl?: string;
  ticketRequired?: boolean;
  ticketTypes?: Array<{
    type: string;
    price: number;
    currency: string;
    availability: number;
  }>;
}

export interface UpdateEventRequest {
  name?: string;
  description?: string;
  thumbnail?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  status?: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
}

export interface PhaseTransitionRequest {
  phase: "PRE_LIVE" | "LIVE" | "POST_LIVE";
}

export interface UpdateEventMetricsRequest {
  viewers?: number;
  messages?: number;
  reactions?: number;
  participants?: number;
}

export interface TestResultsRequest {
  results: Array<{
    timestamp: string;
    status: string;
    notes?: string;
  }>;
}

export interface EventQueryParams extends QueryParams {
  entityId?: string;
  eventType?: "LIVE" | "PRERECORDED";
  phase?: "PRE_LIVE" | "LIVE" | "POST_LIVE";
  status?: "DRAFT" | "SCHEDULED" | "LIVE" | "COMPLETED" | "CANCELLED";
  search?: string;
}

export interface EventsEndpoints {
  create: (data: CreateEventRequest) => Promise<Event>;
  getAll: (params?: EventQueryParams) => Promise<PaginatedResponse<Event>>;
  getById: (id: string) => Promise<Event>;
  update: (id: string, data: UpdateEventRequest) => Promise<Event>;
  delete: (id: string) => Promise<void>;
  transitionPhase: (id: string, data: PhaseTransitionRequest) => Promise<Event>;
  extendPhase: (id: string, hours: number) => Promise<Event>;
  updateMetrics: (id: string, data: UpdateEventMetricsRequest) => Promise<Event>;
  submitTestResults: (id: string, data: TestResultsRequest) => Promise<Event>;
  getMetrics: (id: string) => Promise<Record<string, unknown>>;
}

// ============================================================================
// Follow Endpoints
// ============================================================================

export interface Follower {
  id: string;
  userId: string;
  entityId: string;
  createdAt: string;
  user?: User & { profile?: UserProfile };
}

export interface Following {
  id: string;
  userId: string;
  entityId: string;
  createdAt: string;
  entity?: Entity;
}

export interface FollowEndpoints {
  follow: (entityId: string) => Promise<void>;
  unfollow: (entityId: string) => Promise<void>;
  getFollowers: (entityId: string, params?: QueryParams) => Promise<PaginatedResponse<Follower>>;
  getFollowing: (userId: string, params?: QueryParams) => Promise<PaginatedResponse<Following>>;
  isFollowing: (entityId: string) => Promise<{ isFollowing: boolean }>;
  getFollowCounts: (entityId: string) => Promise<{ followers: number; following: number }>;
}

// ============================================================================
// Store Endpoints
// ============================================================================

export interface CreateStoreRequest {
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  currency?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  collaborators?: string[];
  tags?: string[];
  eventId?: string;
  tourId?: string;
}

export interface UpdateStoreRequest {
  name?: string;
  slug?: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  currency?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  tags?: string[];
}

export interface CreateProductRequest {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isDigital: boolean;
  isAvailable: boolean;
}

export interface UpdateProductRequest {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  isDigital?: boolean;
  isAvailable?: boolean;
}

export interface StoreQueryParams extends QueryParams {
  entityId?: string;
  eventId?: string;
  tourId?: string;
  status?: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  visibility?: "PUBLIC" | "PRIVATE" | "UNLISTED";
  search?: string;
}

export interface StoresEndpoints {
  create: (data: CreateStoreRequest) => Promise<Store>;
  getAll: (params?: StoreQueryParams) => Promise<PaginatedResponse<Store>>;
  getById: (id: string) => Promise<Store>;
  update: (id: string, data: UpdateStoreRequest) => Promise<Store>;
  delete: (id: string) => Promise<void>;
  getEntityStore: (entityId: string) => Promise<Store>;
  addProduct: (storeId: string, data: CreateProductRequest) => Promise<Product>;
  updateProduct: (storeId: string, productId: string, data: UpdateProductRequest) => Promise<Product>;
  removeProduct: (storeId: string, productId: string) => Promise<void>;
}

// ============================================================================
// Streaming Endpoints
// ============================================================================

export interface CreateSessionRequest {
  eventId: string;
  accessLevel?: "PUBLIC" | "PRIVATE" | "INVITE_ONLY";
  geoRegions?: string[];
  metadata?: Record<string, unknown>;
}

export interface GenerateTokenRequest {
  eventId: string;
  participantRole?: "PUBLISHER" | "SUBSCRIBER";
  participantName?: string;
}

// ✅ Single-token authorization model: backend returns ONLY the JWT token string
// Room name and permissions are embedded in the token
// LiveKit URL comes from environment config, not backend
export interface LivekitTokenResponse {
  token: string;
}

export interface StreamingSession {
  id: string;
  eventId: string;
  entityId: string;
  roomId: string;
  sessionKey: string;
  accessLevel: string;
  metrics: Record<string, unknown>;
  geoRegions: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateStreamingMetricsRequest {
  viewers?: number;
  participants?: number;
  messages?: number;
  reactions?: number;
  customMetrics?: Record<string, unknown>;
}

export interface StreamingEndpoints {
  createSession: (eventId: string, data: CreateSessionRequest) => Promise<StreamingSession>;
  generateToken: (eventId: string, data: GenerateTokenRequest) => Promise<LivekitTokenResponse>;
  endSession: (id: string) => Promise<void>;
  getActiveSessions: (params?: QueryParams) => Promise<PaginatedResponse<StreamingSession>>;
  getSessionDetails: (id: string) => Promise<StreamingSession>;
  updateMetrics: (id: string, data: UpdateStreamingMetricsRequest) => Promise<StreamingSession>;
  validateGeofence: (data: { eventId: string; latitude: number; longitude: number }) => Promise<{ allowed: boolean; reason?: string }>;
}

// ============================================================================
// Notifications Endpoints
// ============================================================================

export interface CreateNotificationRequest {
  userId: string;
  entityId?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationResponse {
  id: string;
  userId: string;
  entityId?: string;
  type: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationQueryParams extends QueryParams {
  isRead?: boolean;
  type?: string;
}

export interface NotificationsEndpoints {
  getAll: (params?: NotificationQueryParams) => Promise<PaginatedResponse<NotificationResponse>>;
  getUnreadCount: () => Promise<{ count: number }>;
  markAsRead: (id: string) => Promise<NotificationResponse>;
  clearAll: () => Promise<void>;
}

// ============================================================================
// Analytics Endpoints
// ============================================================================

export interface EntityMetrics {
  totalEvents: number;
  totalRevenue: number;
  totalFollowers: number;
  averageViewers: number;
  totalTickets: number;
}

export interface EventPerformance {
  eventId: string;
  views: number;
  tickets: number;
  revenue: number;
  engagement: number;
}

export interface UserEngagement {
  userId: string;
  eventsAttended: number;
  entitiesFollowed: number;
  purchases: number;
  engagement: number;
}

export interface PlatformOverview {
  totalUsers: number;
  totalEntities: number;
  totalEvents: number;
  totalRevenue: number;
  activeEvents: number;
}

export interface Recommendations {
  events: Array<{ id: string; name: string; thumbnail?: string }>;
  entities: Array<{ id: string; name: string; thumbnail?: string }>;
}

export interface AnalyticsEndpoints {
  getEntityMetrics: (entityId: string) => Promise<EntityMetrics>;
  getEventPerformance: (eventId: string) => Promise<EventPerformance>;
  getUserEngagement: (userId: string) => Promise<UserEngagement>;
  getPlatformOverview: () => Promise<PlatformOverview>;
  getRecommendations: (userId: string) => Promise<Recommendations>;
}

// ============================================================================
// Payments Endpoints
// ============================================================================

export interface CheckoutItem {
  type: "TICKET" | "PRODUCT";
  id: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateCheckoutRequest {
  type: "TICKET" | "PRODUCT";
  items: CheckoutItem[];
  successUrl?: string;
  cancelUrl?: string;
}

export interface CheckoutResponse {
  sessionId: string;
  url: string;
}

export interface Order {
  id: string;
  userId: string;
  entityId?: string;
  eventId?: string;
  storeId?: string;
  type: "TICKET" | "PRODUCT" | "SUBSCRIPTION";
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  ticketId?: string;
  productId?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  name: string;
  description?: string;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  paymentMethod: string;
  stripePaymentId?: string;
  createdAt: string;
}

export interface CreateRefundRequest {
  orderId: string;
  amount?: number;
  reason?: string;
}

export interface RefundResponse {
  id: string;
  orderId: string;
  amount: number;
  status: string;
  createdAt: string;
}

export interface PaymentQueryParams extends QueryParams {
  userId?: string;
  entityId?: string;
  eventId?: string;
  storeId?: string;
  status?: "PENDING" | "COMPLETED" | "CANCELLED" | "REFUNDED";
}

export interface PaymentsEndpoints {
  createCheckout: (data: CreateCheckoutRequest) => Promise<CheckoutResponse>;
  handleWebhook: (payload: unknown) => Promise<void>;
  createRefund: (data: CreateRefundRequest) => Promise<RefundResponse>;
  getOrders: (params?: PaymentQueryParams) => Promise<PaginatedResponse<Order>>;
  getOrder: (id: string) => Promise<Order & { items: OrderItem[]; payments: Payment[] }>;
}

// ============================================================================
// Assets Endpoints
// ============================================================================

export interface UploadAssetRequest {
  file: File;
  type: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  ownerType: "USER" | "ENTITY";
  ownerId: string;
  isPublic?: boolean;
  metadata?: Record<string, unknown>;
}

export interface AssetQueryParams extends QueryParams {
  type?: "IMAGE" | "VIDEO" | "AUDIO" | "DOCUMENT";
  ownerType?: "USER" | "ENTITY";
  ownerId?: string;
  isPublic?: boolean;
}

export interface AssetsEndpoints {
  upload: (data: UploadAssetRequest) => Promise<Asset>;
  getAll: (params?: AssetQueryParams) => Promise<PaginatedResponse<Asset>>;
  getById: (id: string) => Promise<Asset>;
  getUrl: (id: string) => Promise<string>;
  delete: (id: string) => Promise<void>;
}

// ============================================================================
// Complete API Client Type
// ============================================================================

export interface ShowgeoApiClient {
  auth: AuthEndpoints;
  users: UsersEndpoints;
  entities: EntitiesEndpoints;
  events: EventsEndpoints;
  follow: FollowEndpoints;
  stores: StoresEndpoints;
  streaming: StreamingEndpoints;
  notifications: NotificationsEndpoints;
  analytics: AnalyticsEndpoints;
  payments: PaymentsEndpoints;
  assets: AssetsEndpoints;
}

// ============================================================================
// Note: All types are already exported via their interface definitions above.
// This file serves as a registry/reference for all API client types.
// Actual implementations are in their respective service files.
// ============================================================================

