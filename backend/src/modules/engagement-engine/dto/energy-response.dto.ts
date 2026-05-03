import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EnergySnapshotItemDto {
  @ApiPropertyOptional({ description: "Snapshot id" })
  id?: string;
  @ApiPropertyOptional({ description: "Window start (ISO)" })
  windowStart?: string;
  @ApiPropertyOptional({ description: "Window end (ISO)" })
  windowEnd?: string;
  @ApiPropertyOptional({ description: "Reaction velocity" })
  reactionVelocity?: number;
  @ApiPropertyOptional({ description: "Chat velocity" })
  chatVelocity?: number;
  @ApiPropertyOptional({ description: "Active viewers count" })
  activeViewers?: number;
  @ApiPropertyOptional({ description: "Aggregate energy score" })
  energyScore?: number;
  @ApiPropertyOptional({ description: "Created at (ISO)" })
  createdAt?: string;
}

export class EnergyResponseDto {
  @ApiProperty({ description: "Event id" })
  eventId!: string;
  @ApiProperty({ type: [EnergySnapshotItemDto], description: "Crowd energy snapshots (realtime writes)" })
  snapshots!: EnergySnapshotItemDto[];
  @ApiPropertyOptional({ description: "Latest aggregate energy score" })
  latestEnergyScore?: number;
}
