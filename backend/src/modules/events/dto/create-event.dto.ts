import { IsString, IsOptional, IsEnum, IsBoolean, IsDateString, IsArray, IsObject, IsUUID, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum EventType {
  LIVE = "LIVE",
  PRERECORDED = "PRERECORDED",
}

export enum EventPhase {
  PRE_CONCERT = "PRE_CONCERT",
  CONCERT = "CONCERT",
  POST_CONCERT = "POST_CONCERT",
}

export enum EventStatus {
  DRAFT = "DRAFT",
  SCHEDULED = "SCHEDULED",
  LIVE = "LIVE",
  COMPLETED = "COMPLETED",
  CANCELLED = "CANCELLED",
}

export enum StreamingAccessLevel {
  LOCAL = "LOCAL",
  REGIONAL = "REGIONAL",
  NATIONAL = "NATIONAL",
  INTERNATIONAL = "INTERNATIONAL",
}

export enum TicketTypeEnum {
  FREE = "FREE",
  GIFTED = "GIFTED",
  PAID = "PAID",
}

export class TicketTypeDto {
  @ApiProperty({ enum: TicketTypeEnum })
  @IsEnum(TicketTypeEnum)
  type: TicketTypeEnum;

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

  @ApiProperty({ enum: EventType, default: EventType.LIVE })
  @IsEnum(EventType)
  eventType: EventType;

  @ApiProperty({ enum: EventPhase, default: EventPhase.PRE_CONCERT })
  @IsEnum(EventPhase)
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

  @ApiProperty({ enum: EventStatus, default: EventStatus.DRAFT })
  @IsEnum(EventStatus)
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

  @ApiPropertyOptional({ enum: StreamingAccessLevel })
  @IsOptional()
  @IsEnum(StreamingAccessLevel)
  streamingAccessLevel?: StreamingAccessLevel;

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

