/**
 * Ticket Status Types
 * 
 * Local TypeScript enum for ticket status.
 * The tickets model in Prisma schema uses a String field for status,
 * not a Prisma enum, so TicketStatus is not available in @prisma/client.
 * 
 * Values match database string values exactly.
 */

export enum TicketStatus {
  ACTIVE = "ACTIVE",
  USED = "USED",
  CANCELLED = "CANCELLED",
  EXPIRED = "EXPIRED",
}

