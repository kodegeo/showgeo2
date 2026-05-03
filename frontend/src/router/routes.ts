/**
 * Central route path constants. Actual routing is defined in App.tsx.
 */
export const ROUTES = {
  studio: {
    /** Canonical studio home (metrics + events snapshot) */
    overview: "/studio/overview",
    /** @deprecated Old URL — router redirects to `overview` */
    legacyDashboard: "/studio/dashboard",
    events: "/studio/events",
    /** 3-step Event Creation Wizard */
    createEvent: "/studio/events/create",
    eventNew: "/studio/events/new",
    event: (id: string) => `/studio/events/${id}`,
    eventEdit: (id: string) => `/studio/events/${id}/edit`,
    /** Unified event management (overview, audience, tickets, messaging, settings) */
    eventManage: (id: string, tab?: string) =>
      tab && tab !== "overview"
        ? `/studio/events/${id}/manage?tab=${tab}`
        : `/studio/events/${id}/manage`,
    /** @deprecated Prefer eventManage — legacy URL may redirect */
    eventAccess: (id: string) => `/studio/events/${id}/manage?tab=audience`,
    /** @deprecated Prefer eventManage — legacy URL may redirect */
    eventTickets: (id: string) => `/studio/events/${id}/manage?tab=tickets`,
    eventLive: (id: string) => `/studio/events/${id}/live`,
  },
} as const;
