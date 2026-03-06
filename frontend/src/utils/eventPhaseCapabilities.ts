import { EventPhase } from "@/types/eventPhase";

/**
 * Phase Capability Matrix
 * 
 * Defines which sections and actions are enabled/disabled for each event phase.
 * This is the single source of truth for phase-based UI gating.
 * 
 * Phases: PRE_LIVE → LIVE → POST_LIVE
 * POST_LIVE is terminal for streaming.
 */
export interface PhaseCapabilities {
  // Sections
  audience: boolean; // Manage audience, invite users, share links
  promotion: boolean; // Posts, rooms, announcements
  ticketing: boolean; // Ticket management
  liveIntroduction: boolean; // Live Introduction configuration
  eventMetadata: boolean; // Edit event details
  store: boolean; // Store / merch setup
  
  // Streaming
  streaming: boolean; // Streaming controls, token generation, session creation
  goLive: boolean; // Go Live / Start Stream actions
  
  // Post-Event
  postEventRooms: boolean; // VIP rooms, discussion rooms
  postEventEngagement: boolean; // Follow-up posts, audience engagement
  postEventMerchandise: boolean; // Merchandise promotions
  
  // Analytics & Content
  analytics: boolean; // Viewer metrics, analytics
  recordings: boolean; // Event recordings (future-ready)
  
  // Helper text for UX guidance
  helperText: string;
}

export const PHASE_CAPABILITIES: Record<EventPhase, PhaseCapabilities> = {
  PRE_LIVE: {
    // Preparation & Promotion
    audience: true,
    promotion: true,
    ticketing: true,
    liveIntroduction: true,
    eventMetadata: true,
    store: true,
    
    // Streaming disabled
    streaming: false,
    goLive: false,
    
    // Post-Event disabled
    postEventRooms: false,
    postEventEngagement: false,
    postEventMerchandise: false,
    
    // Analytics available
    analytics: true,
    recordings: false,
    
    helperText: "Prepare and promote your event. Configure ticketing and your Live Introduction.",
  },
  
  LIVE: {
    // Broadcast & Engagement
    audience: true,
    promotion: true,
    ticketing: true, // Can still manage tickets during live
    liveIntroduction: false, // Not applicable during live
    eventMetadata: false, // Structural edits restricted
    store: true, // Live merchandise promotions
    
    // Streaming enabled
    streaming: true,
    goLive: true,
    
    // Post-Event disabled (still live)
    postEventRooms: false,
    postEventEngagement: false,
    postEventMerchandise: false,
    
    // Analytics available
    analytics: true,
    recordings: false,
    
    helperText: "You are live",
  },
  
  POST_LIVE: {
    // Continuation & Monetization
    audience: true,
    promotion: true,
    ticketing: true, // View ticket summaries
    liveIntroduction: false, // Not applicable post-event
    eventMetadata: false, // Event is complete
    store: true, // Post-event merchandise promotions
    
    // Streaming disabled (terminal)
    streaming: false,
    goLive: false,
    
    // Post-Event enabled
    postEventRooms: true,
    postEventEngagement: true,
    postEventMerchandise: true,
    
    // Analytics available
    analytics: true,
    recordings: true, // Future-ready for recordings
    
    helperText: "The live event has ended — continue the experience",
  },
};

/**
 * Get capabilities for a given event phase
 */
export function getPhaseCapabilities(phase: EventPhase): PhaseCapabilities {
  return PHASE_CAPABILITIES[phase] || PHASE_CAPABILITIES.PRE_LIVE;
}

/**
 * Check if a specific capability is enabled for a phase
 */
export function isCapabilityEnabled(
  phase: EventPhase,
  capability: keyof PhaseCapabilities
): boolean {
  const capabilities = getPhaseCapabilities(phase);
  return capabilities[capability] === true;
}

