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
}

