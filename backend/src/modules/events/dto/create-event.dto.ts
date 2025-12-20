import { IsString, IsOptional, IsIn, IsBoolean, IsDateString, IsArray, IsObject, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, EventType, EventPhase, EventStatus, GeofencingAccessLevel, TicketType } from "../../../common/runtime-enums";

export class TicketTypeDto {
  @ApiProperty({ enum: RuntimeEnums.TicketType })
  @IsIn(RuntimeEnums.TicketType)
  type: TicketType;

  @ApiPropertyOptional()
  @IsOptional()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @Min(0)
  availability: number;
}

export class CreateEventDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiProperty({ enum: RuntimeEnums.EventType, default: "LIVE" })
  @IsIn(RuntimeEnums.EventType)
  eventType: EventType;

  @ApiProperty({ enum: RuntimeEnums.EventPhase, default: "PRE_LIVE" })
  @IsIn(RuntimeEnums.EventPhase)
  phase: EventPhase;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ enum: RuntimeEnums.EventStatus, default: "DRAFT" })
  @IsIn(RuntimeEnums.EventStatus)
  status: EventStatus;

  @ApiProperty()
  @IsUUID()
  entityId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventCoordinatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tourId?: string;

  // Streaming
  @ApiProperty({ default: false })
  @IsBoolean()
  isVirtual: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streamUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  testStreamUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  videoUrl?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.GeofencingAccessLevel })
  @IsOptional()
  @IsIn(RuntimeEnums.GeofencingAccessLevel)
  streamingAccessLevel?: GeofencingAccessLevel;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoRegions?: string[];

  @ApiProperty({ default: false })
  @IsBoolean()
  geoRestricted: boolean;

  // Ticketing
  @ApiProperty({ default: true })
  @IsBoolean()
  ticketRequired: boolean;

  @ApiPropertyOptional({ type: [TicketTypeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes?: TicketTypeDto[];

  @ApiProperty({ default: false })
  @IsBoolean()
  entryCodeRequired: boolean;

  @ApiProperty({ default: false })
  @IsBoolean()
  entryCodeDelivery: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketEmailTemplate?: string;

  // Event Management
  @ApiProperty({ default: false })
  @IsBoolean()
  testingEnabled: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  customBranding?: Record<string, unknown>;

  // Collaborators
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  collaboratorEntityIds?: string[];
}

