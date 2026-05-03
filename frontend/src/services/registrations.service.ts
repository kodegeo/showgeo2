/**
 * @deprecated Legacy event registration / invitation HTTP client.
 *
 * **Creator access & access_pass distribution:** use {@link eventsService} from `events.service.ts`
 * (`eventsService.getTicketTypes`, `inviteToEvent`, `registerWithTicketType`, `registerForEvent`, `getEventAccessCode`).
 *
 * **Still used by:** `CreatorEventInvitationsPage` (list/search/legacy POST …/invitations) until that UI is rebuilt.
 * **Not used by:** `CreatorEventManagePage` or `CreatorEventAccessPage` (use `eventsService`).
 *
 * **Owned tickets:** use `ticketsService` (`/tickets/my`) only for purchased/claimed ticket rows, not pending invites.
 */
import { apiClient } from "./api";
import { API } from "./apiRoutes";

export interface InviteePayload {
  userId?: string;
  email?: string;
}

export interface SendInvitationsPayload {
  audience?: "FOLLOWERS" | "EMAIL_LIST";
  emails?: string[];
  invitees?: InviteePayload[];
  accessType?: "FREE" | "TICKET";
  ticketTypeId?: string;
  message?: string;
}

export interface InvitationRow {
  id: string;
  userId: string | null;
  email: string | null;
  status: string;
  createdAt: string;
  accessCode?: string | null;
  displayName?: string | null;
}

export interface ListInvitationsResponse {
  invitations: InvitationRow[];
}

export interface EventAccessCodeResponse {
  accessCode: string;
}

export interface SearchUserItem {
  id: string;
  username: string | null;
  email: string | null;
  displayName: string;
}

export interface SearchUsersResponse {
  users: SearchUserItem[];
}

export const registrationsService = {
  /**
   * Send invitations: either audience FOLLOWERS or specific invitees.
   */
  async sendInvitations(
    eventId: string,
    payload: SendInvitationsPayload,
  ): Promise<{ created: number; skipped: number }> {
    const { data } = await apiClient.post<{ created: number; skipped: number }>(
      API.eventRegistrationsInvitations(eventId),
      payload,
    );
    return data;
  },

  /**
   * List invitations for an event (creator only).
   */
  async listInvitations(eventId: string): Promise<ListInvitationsResponse> {
    const { data } = await apiClient.get<ListInvitationsResponse>(
      API.eventRegistrationsInvitations(eventId),
    );
    return data;
  },

  /**
   * Get or create event access code (creator only).
   */
  async getEventAccessCode(eventId: string): Promise<EventAccessCodeResponse> {
    const { data } = await apiClient.get<EventAccessCodeResponse>(
      API.eventRegistrationsAccessCode(eventId),
    );
    return data;
  },

  /**
   * Search users to invite (creator only). Min 2 chars.
   */
  async searchUsersToInvite(eventId: string, q: string): Promise<SearchUsersResponse> {
    const { data } = await apiClient.get<SearchUsersResponse>(
      API.eventRegistrationsSearchUsers(eventId),
      { params: { q: q.trim() } },
    );
    return data;
  },

  async claimInvite(eventId: string, accessCode: string): Promise<{ success: true }> {
    const { data } = await apiClient.post<{ success: true }>(`/events/${eventId}/claim`, {
      accessCode,
    });
    return data;
  },
};
