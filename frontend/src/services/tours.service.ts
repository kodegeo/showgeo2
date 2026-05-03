import { apiClient } from "./api";

export interface TourListItem {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  bannerImage?: string | null;
  startDate: string;
  endDate?: string | null;
  status: string;
  tags: string[];
}

export interface TourEvent {
  id: string;
  name: string;
  startTime: string;
  endTime?: string | null;
  location?: string | null;
  status?: string;
  phase?: string;
  thumbnail?: string | null;
  entityId?: string;
}

export interface Tour {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  thumbnail?: string | null;
  bannerImage?: string | null;
  startDate: string;
  endDate?: string | null;
  status: string;
  tags: string[];
  events?: TourEvent[];
}

export const toursService = {
  /**
   * List tours (GET /tours). Optional entityId filter.
   */
  async getAll(params?: { entityId?: string }): Promise<{ data: TourListItem[] }> {
    const { data } = await apiClient.get<{ data: TourListItem[] }>("/tours", { params });
    return data;
  },

  /**
   * Get a tour by slug, optionally with events.
   */
  async getBySlug(slug: string, includeEvents = true): Promise<Tour> {
    const params = includeEvents ? { includeEvents: "true" } : undefined;
    const { data } = await apiClient.get<Tour>(`/tours/slug/${slug}`, { params });
    return data;
  },
};
