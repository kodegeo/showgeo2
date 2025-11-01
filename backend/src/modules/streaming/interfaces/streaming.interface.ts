export interface LiveKitRoomConfig {
  name: string;
  emptyTimeout: number;
  maxParticipants: number;
  creationTime: number;
  turnPassword?: string;
}

export interface LiveKitTokenPayload {
  identity: string;
  room: string;
  participantIdentity?: string;
  video?: {
    room: string;
    roomJoin: boolean;
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
  };
  audio?: {
    room: string;
    roomJoin: boolean;
    canPublish: boolean;
    canSubscribe: boolean;
    canPublishData: boolean;
  };
}

export interface StreamingMetrics {
  viewers: number;
  participants: number;
  messages: number;
  reactions: number;
  duration?: number;
  peakViewers?: number;
  customMetrics?: Record<string, unknown>;
}

export interface GeofenceValidationResult {
  allowed: boolean;
  reason?: string;
  matchedRegions?: string[];
}

