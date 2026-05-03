import { apiClient } from "./api";
import { API } from "./apiRoutes";

export interface CreateClipRequest {
  startTime: number;
  duration: number;
  title?: string;
  description?: string;
}

export interface Clip {
  id: string;
  event_id: string;
  creator_id: string;
  start_time: number;
  duration: number;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  views: number | null;
  created_at: string | null;
  updated_at: string | null;
  events?: {
    id: string;
    name: string;
    entityId: string;
    thumbnail?: string | null;
    entities_events_entityIdToentities?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
}

export interface TrendingClipItem {
  id: string;
  videoUrl: string | null;
  creatorName: string;
  eventName: string;
  views: number;
}

export interface ShareMetadata {
  clipUrl: string;
  caption: string;
  hashtags: string[];
  shareLinks: {
    twitter: string;
    facebook: string;
    linkedin: string;
  };
}

export const clipsService = {
  getTrendingClips() {
    return apiClient.get<TrendingClipItem[]>(API.clipsTrending).then(r => r.data);
  },

  getClip(clipId: string) {
    return apiClient.get<Clip>(API.clip(clipId)).then(r => r.data);
  },

  getClipsByEvent(eventId: string) {
    return apiClient.get<Clip[]>(API.eventClips(eventId)).then(r => r.data);
  },

  createClip(eventId: string, body: CreateClipRequest) {
    return apiClient.post<Clip>(`/events/${eventId}/clips`, body).then(r => r.data);
  },

  deleteClip(clipId: string) {
    return apiClient.delete(API.clip(clipId));
  },

  getShareMetadata(clipId: string, platform?: string) {
    return apiClient
      .post<ShareMetadata>(API.clipShare(clipId), platform ? { platform } : {})
      .then(r => r.data);
  },
};
