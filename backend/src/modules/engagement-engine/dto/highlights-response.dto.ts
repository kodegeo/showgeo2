import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class HighlightMomentItemDto {
  @ApiPropertyOptional({ description: "Highlight record id" })
  id?: string;
  @ApiPropertyOptional({ description: "Stream session id" })
  streamSessionId?: string;
  @ApiPropertyOptional({ description: "Start time (seconds)" })
  startTime?: number;
  @ApiPropertyOptional({ description: "Duration (seconds)" })
  duration?: number;
  @ApiPropertyOptional({ description: "Energy score at highlight" })
  energyScore?: number;
  @ApiPropertyOptional({ description: "Created at (ISO)" })
  createdAt?: string;
}

export class HighlightsResponseDto {
  @ApiProperty({ description: "Event id" })
  eventId!: string;
  @ApiProperty({ type: [HighlightMomentItemDto], description: "Highlight moments (realtime writes)" })
  highlights!: HighlightMomentItemDto[];
}
