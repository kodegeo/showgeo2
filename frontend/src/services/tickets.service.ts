import { apiClient } from "./api";

export interface MyTicket {
  id: string;
  eventId: string;
  eventName: string;
  entityName?: string;
  startTime: string;
  thumbnail: string | null;
  ticketType: string;
  orderId: string | null;
}

export interface MyTicketsResponse {
  tickets: MyTicket[];
}

export interface MyAccessPassTicket {
  accessPassId: string;
  eventId: string;
  eventTitle: string;
  startTime: string;
  status: "UPCOMING" | "LIVE" | "ENDED";
}

export interface MyAccessPassTicketsResponse {
  tickets: MyAccessPassTicket[];
}

/**
 * Purchased / issued tickets from `GET /tickets/my` only.
 * Not for pending SENT invitations — those surface via mailbox + access_pass (see `eventsService`).
 */
export const ticketsService = {
  async getMyTickets(): Promise<MyTicketsResponse> {
    const { data } = await apiClient.get<MyTicketsResponse>("/tickets/my");
    return data;
  },

  async getMyAccessPassTickets(): Promise<MyAccessPassTicketsResponse> {
    const { data } = await apiClient.get<MyAccessPassTicketsResponse>("/me/tickets");
    return data;
  },
};
