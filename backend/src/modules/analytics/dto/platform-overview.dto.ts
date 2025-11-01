import { ApiProperty } from "@nestjs/swagger";

export class PlatformOverviewDto {
  @ApiProperty()
  totalUsers: number;

  @ApiProperty()
  totalEntities: number;

  @ApiProperty()
  totalEvents: number;

  @ApiProperty()
  activeSessions: number;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  topPerformingEntities: {
    entityId: string;
    entityName: string;
    engagementScore: number;
    followers: number;
    events: number;
    revenue: number;
  }[];

  @ApiProperty()
  recentActivity: {
    newUsers: number;
    newEvents: number;
    newProducts: number;
    streamingHours: number;
  };
}

