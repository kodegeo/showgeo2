import { ApiProperty } from "@nestjs/swagger";

export class EventAnalyticsDto {
  @ApiProperty({ description: "Number of tickets sold for the event" })
  ticketSales: number;

  @ApiProperty({ description: "Total revenue from order items for the event" })
  revenue: number;

  @ApiProperty({ description: "Number of event registrations" })
  registrations: number;

  @ApiProperty({ description: "Peak concurrent viewers across streaming sessions" })
  viewers: number;
}
