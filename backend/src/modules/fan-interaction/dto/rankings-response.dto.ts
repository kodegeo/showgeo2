import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FanRankingItemDto {
  @ApiPropertyOptional({ description: "Ranking record id" })
  id?: string;
  @ApiProperty({ description: "User id" })
  userId!: string;
  @ApiProperty({ description: "Rank position" })
  rank!: number;
  @ApiPropertyOptional({ description: "Engagement score" })
  engagementScore?: number;
  @ApiPropertyOptional({ description: "Last updated" })
  updatedAt?: string;
}

export class RankingsResponseDto {
  @ApiProperty({ description: "Event id" })
  eventId!: string;
  @ApiProperty({ type: [FanRankingItemDto], description: "Ranked fans by engagement" })
  rankings!: FanRankingItemDto[];
}
