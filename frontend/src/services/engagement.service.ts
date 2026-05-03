import { apiClient } from "./api";

export interface EnergySnapshotItem {
  id?: string;
  windowStart?: string;
  windowEnd?: string;
  reactionVelocity?: number;
  chatVelocity?: number;
  activeViewers?: number;
  energyScore?: number;
  createdAt?: string;
}

export interface EnergyResponse {
  eventId: string;
  snapshots: EnergySnapshotItem[];
  latestEnergyScore?: number;
}

export interface HighlightMomentItem {
  id?: string;
  streamSessionId?: string;
  startTime?: number;
  duration?: number;
  energyScore?: number;
  createdAt?: string;
}

export interface HighlightsResponse {
  eventId: string;
  highlights: HighlightMomentItem[];
}

export const engagementService = {
  async getEnergy(eventId: string): Promise<EnergyResponse> {
    const { data } = await apiClient.get<EnergyResponse>(`/events/${eventId}/energy`);
    return data;
  },

  async getHighlights(eventId: string): Promise<HighlightsResponse> {
    const { data } = await apiClient.get<HighlightsResponse>(`/events/${eventId}/highlights`);
    return data;
  },
};
