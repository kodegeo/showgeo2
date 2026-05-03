/**
 * Central API route map. All paths are relative to /api (apiClient baseURL).
 * Use these constants instead of raw strings to avoid typos and legacy paths.
 */
export const API = {
  // Auth
  authMe: "/auth/me",
  authRegisterAppUser: "/auth/register-app-user",

  // Users
  users: "/users",
  user: (id: string) => `/users/${id}`,
  userByUsername: (username: string) => `/users/username/${username}`,
  userEntities: (userId: string) => `/users/${userId}/entities`,
  userConvertToEntity: (userId: string) => `/users/${userId}/convert-to-entity`,
  usersUpgradeToCreator: "/users/upgrade-to-creator",
  usersAcceptCodeOfConduct: "/users/accept-code-of-conduct",

  // Entities
  entities: "/entities",
  entity: (id: string) => `/entities/${id}`,
  entityBySlug: (slug: string) => `/entities/slug/${slug}`,
  entitiesPopular: "/entities/popular",
  entitiesMyApplications: "/entities/my-applications",
  entitiesCreatorApply: "/entities/creator-apply",
  entityCollaborators: (id: string) => `/entities/${id}/collaborators`,
  entityCollaborator: (id: string, userId: string) => `/entities/${id}/collaborators/${userId}`,

  // Events
  events: "/events",
  event: (id: string) => `/events/${id}`,
  eventPhaseTransition: (id: string) => `/events/${id}/phase/transition`,
  eventPhaseExtend: (id: string) => `/events/${id}/phase/extend`,
  eventStream: (id: string) => `/events/${id}/stream`,
  eventClips: (id: string) => `/events/${id}/clips`,
  eventRevenue: (id: string) => `/events/${id}/revenue`,
  eventMetrics: (id: string) => `/events/${id}/metrics`,
  eventAccess: (id: string) => `/events/${id}/access`,
  eventRoles: (id: string) => `/events/${id}/roles`,
  eventAnalytics: (id: string) => `/events/${id}/analytics`,
  eventReminders: (id: string) => `/events/${id}/reminders`,
  eventMyEvents: "/events/my-events",
  eventUpcoming: "/events/upcoming",
  eventDiscovery: "/events/discovery",
  eventFollowed: "/events/followed",
  eventTestResults: (id: string) => `/events/${id}/test-results`,
  eventAudienceAction: (id: string) => `/events/${id}/audience-action`,
  eventBlasts: (id: string) => `/events/${id}/blasts`,
  eventActivities: (id: string) => `/events/${id}/activities`,
  eventReports: (id: string) => `/events/${id}/reports`,
  eventRegister: (eventId: string) => `/events/${eventId}/registrations/register`,
  /** POST body: { ticketTypeId } — creates access_pass (auth) */
  eventRegisterWithTicket: (eventId: string) => `/events/${eventId}/register`,
  /** GET — optional auth (Bearer) for personalized access snapshot */
  eventAccessStatus: (eventId: string) => `/events/${eventId}/access-status`,
  /** POST free registration (ticket + pass) */
  eventRegisterFree: (eventId: string) => `/events/${eventId}/register-free`,
  /** POST paid checkout — creates order + order_item */
  eventCheckout: (eventId: string) => `/events/${eventId}/checkout`,
  /** POST simulate payment success (dev) */
  eventConfirmOrder: (eventId: string, orderId: string) =>
    `/events/${eventId}/orders/${orderId}/confirm`,
  /** POST body: { type, ticketTypeId, emails? } — creator invite distribution */
  eventInvite: (eventId: string) => `/events/${eventId}/invite`,
  /** POST body: { type: "FOLLOWERS", ticketTypeId } — transactional invite flow */
  eventInviteFollowers: (eventId: string) => `/events/${eventId}/invite-followers`,
  /** Preferred: POST invitations on events resource */
  eventInvitations: (eventId: string) => `/events/${eventId}/invitations`,
  eventRegistrationsInvitations: (eventId: string) =>
    `/events/${eventId}/registrations/invitations`,
  eventRegistrationsAccessCode: (eventId: string) => `/events/${eventId}/registrations/access-code`,
  eventRegistrationsSearchUsers: (eventId: string) =>
    `/events/${eventId}/registrations/search-users`,

  // Activities (event-activities)
  activityLaunch: (activityId: string) => `/activities/${activityId}/launch`,
  activityComplete: (activityId: string) => `/activities/${activityId}/complete`,

  // Moderation / reports
  meReports: "/me/reports",
  reportStatus: (reportId: string) => `/reports/${reportId}/status`,

  // Meet & Greet
  meetGreetQueue: (eventId: string) => `/events/${eventId}/meet-greet/queue`,
  meetGreetCurrent: (eventId: string) => `/events/${eventId}/meet-greet/current`,
  meetGreetStartNext: (eventId: string) => `/events/${eventId}/meet-greet/start-next`,
  meetGreetSessionComplete: (sessionId: string) => `/meet-greet/sessions/${sessionId}/complete`,
  meetGreetSessionMiss: (sessionId: string) => `/meet-greet/sessions/${sessionId}/miss`,
  meetGreetSessionJoinVip: (sessionId: string) => `/meet-greet/sessions/${sessionId}/join-vip`,

  // Streaming
  streamingActive: "/streaming/active",
  streamingSession: (eventId: string) => `/streaming/session/${eventId}`,
  streamingSessionEnd: (sessionId: string) => `/streaming/session/${sessionId}/end`,
  streamingToken: (eventId: string) => `/streaming/${eventId}/token`,
  streamingSessionById: (id: string) => `/streaming/${id}`,
  streamingMetrics: (id: string) => `/streaming/${id}/metrics`,

  // Follow
  follow: (entityId: string) => `/follow/${entityId}`,
  followEvent: (eventId: string) => `/follow/event/${eventId}`,
  followEventStatus: (eventId: string) => `/follow/event/status/${eventId}`,
  followEventNotify: (eventId: string) => `/follow/event/${eventId}/notify`,
  followUser: (userId: string) => `/follow/user/${userId}`,
  followStatus: (entityId: string) => `/follow/status/${entityId}`,
  followCountsEntity: (entityId: string) => `/follow/counts/entity/${entityId}`,
  followEntityFollowers: (entityId: string) => `/follow/${entityId}/followers`,

  // Assets
  assets: "/assets",
  assetsUpload: "/assets/upload",
  asset: (id: string) => `/assets/${id}`,
  assetUrl: (id: string) => `/assets/${id}/url`,

  // Mailbox (user-level)
  mailbox: "/mailbox",
  mailboxMarkRead: (id: string) => `/mailbox/${id}/read`,

  // Stores
  stores: "/stores",
  store: (id: string) => `/stores/${id}`,
  storeByEntity: (entityId: string) => `/stores/entity/${entityId}`,
  storeProducts: (storeId: string) => `/stores/${storeId}/products`,
  storeProduct: (productId: string) => `/stores/products/${productId}`,

  // Clips
  clipsTrending: "/clips/trending",
  clip: (clipId: string) => `/clips/${clipId}`,
  clipShare: (clipId: string) => `/clips/${clipId}/share`,

  // Tickets
  ticketsMy: "/tickets/my",

  // Admin
  adminUsers: "/admin/users",
  adminUser: (id: string) => `/admin/users/${id}`,
  adminUserSuspend: (id: string) => `/admin/users/${id}/suspend`,
  adminUserReinstate: (id: string) => `/admin/users/${id}/reinstate`,
  adminUserPromoteToAdmin: (id: string) => `/admin/users/${id}/promote-to-admin`,
  adminUserDemoteAdmin: (id: string) => `/admin/users/${id}/demote-admin`,
  adminUserDisable: (id: string) => `/admin/users/${id}/disable`,
  adminUserEnable: (id: string) => `/admin/users/${id}/enable`,
  adminEntities: "/admin/entities",
  adminEntity: (id: string) => `/admin/entities/${id}`,
  adminEntityDisable: (id: string) => `/admin/entities/${id}/disable`,
  adminEntityReinstate: (id: string) => `/admin/entities/${id}/reinstate`,
  adminEntitySuspend: (id: string) => `/admin/entities/${id}/suspend`,
  adminEntityReject: (id: string) => `/admin/entities/${id}/reject`,
  adminReports: "/admin/reports",
  adminReportResolve: (reportId: string) => `/admin/reports/${reportId}/resolve`,
  adminEventsTerminate: (eventId: string) => `/admin/events/${eventId}/terminate`,
  adminEntityApplications: "/admin/entity-applications",
  adminEntityApplication: (id: string) => `/admin/entity-applications/${id}`,
  adminEntityApplicationAccept: (id: string) => `/admin/entity-applications/${id}/accept`,
  adminEntityApplicationReject: (id: string) => `/admin/entity-applications/${id}/reject`,
  adminEntityApplicationBan: (id: string) => `/admin/entity-applications/${id}/ban`,
  adminStreamSessions: "/admin/stream-sessions",
  adminStreamSessionResolve: (sessionId: string) => `/admin/stream-sessions/${sessionId}/resolve`,
  adminSystemAudit: "/admin/system-audit",

  // Tours
  tours: "/tours",
  tourBySlug: (slug: string) => `/tours/slug/${slug}`,
  tour: (id: string) => `/tours/${id}`,
};
