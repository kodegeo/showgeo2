import { ApiProperty } from "@nestjs/swagger";

export class EntityMetricsDto {
  @ApiProperty()
  eventsCount: number;

  @ApiProperty()
  activeFollowers: number;

  @ApiProperty()
  storeSales: number;

  @ApiProperty()
  storeRevenue: number;

  @ApiProperty()
  averageViewers: number;

  @ApiProperty()
  notificationsSent: number;

  @ApiProperty()
  engagementScore: number;

  @ApiProperty()
  totalTicketsSold: number;

  @ApiProperty()
  totalTicketRevenue: number;

  @ApiProperty({ description: "Total event registrations across entity events" })
  totalRegistrations: number;

  @ApiProperty({
    description: "Top performing events by tickets/revenue",
    type: "array",
    items: {
      type: "object",
      properties: {
        eventId: { type: "string" },
        name: { type: "string" },
        ticketSales: { type: "number" },
        revenue: { type: "number" },
      },
    },
  })
  topPerformingEvents?: Array<{
    eventId: string;
    name: string;
    ticketSales: number;
    revenue: number;
  }>;
}

