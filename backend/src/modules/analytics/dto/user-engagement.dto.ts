import { ApiProperty } from "@nestjs/swagger";

export class UserEngagementDto {
  @ApiProperty()
  eventsAttended: number;

  @ApiProperty()
  streamsWatched: number;

  @ApiProperty()
  productsPurchased: number;

  @ApiProperty()
  entitiesFollowed: number;

  @ApiProperty()
  totalSpent: number;

  @ApiProperty()
  engagementScore: number;

  @ApiProperty()
  favoriteCategories: string[];

  @ApiProperty()
  mostEngagedEntities: {
    entityId: string;
    entityName: string;
    interactions: number;
  }[];
}

