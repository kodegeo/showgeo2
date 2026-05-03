import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class FanPresenceItemDto {
  @ApiPropertyOptional({ description: "Fan presence record id" })
  id?: string;
  @ApiProperty({ description: "User id" })
  userId!: string;
  @ApiPropertyOptional({ description: "Role in the event" })
  role?: string;
  @ApiPropertyOptional({ description: "When the fan joined" })
  joinedAt?: string;
  @ApiPropertyOptional({ description: "Last activity timestamp" })
  lastActiveAt?: string;
}

export class FansResponseDto {
  @ApiProperty({ description: "Event id" })
  eventId!: string;
  @ApiProperty({ type: [FanPresenceItemDto], description: "Fans currently or recently present" })
  fans!: FanPresenceItemDto[];
  @ApiProperty({ description: "Total count" })
  total!: number;
}
