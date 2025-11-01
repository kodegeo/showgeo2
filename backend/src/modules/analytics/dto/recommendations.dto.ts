import { ApiProperty } from "@nestjs/swagger";

export class RecommendationDto {
  @ApiProperty()
  entityId: string;

  @ApiProperty()
  entityName: string;

  @ApiProperty()
  entitySlug: string;

  @ApiProperty()
  entityType: string;

  @ApiProperty()
  score: number; // Similarity score (0-1)

  @ApiProperty()
  reasons: string[]; // Why this is recommended

  @ApiProperty()
  thumbnail?: string;
}

export class RecommendationsResponseDto {
  @ApiProperty({ type: [RecommendationDto] })
  entities: RecommendationDto[];

  @ApiProperty({ type: [RecommendationDto] })
  events: RecommendationDto[];
}

