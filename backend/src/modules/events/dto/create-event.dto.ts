import { IsString, IsOptional, IsIn, IsBoolean, IsDateString, IsArray, IsObject, IsUUID, IsNumber, IsInt, Min, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, EventType, EventPhase, EventStatus, GeofencingAccessLevel } from "../../../common/runtime-enums";

export class TicketTypeDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  quantity: number;

  @ApiProperty({ enum: ["GENERAL", "VIP"] })
  @IsIn(["GENERAL", "VIP"])
  accessLevel: "GENERAL" | "VIP";

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresInvite?: boolean;
}

export class CreateEventDto {
  // ✅ REQUIRED FIELDS ONLY
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsDateString()
  startTime: string;

  @ApiProperty()
  @IsUUID()
  entityId: string;

  // ✅ OPTIONAL FIELDS
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  /** For quick event creation: single ticket price. Backend builds default ticketTypes from this. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  ticketPrice?: number;

  // ❌ DO NOT REQUIRE - These are set by backend defaults
  @ApiPropertyOptional({ enum: RuntimeEnums.EventType, default: "LIVE" })
  @IsOptional()
  @IsIn(RuntimeEnums.EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: RuntimeEnums.EventPhase, default: "PRE_LIVE" })
  @IsOptional()
  @IsIn(RuntimeEnums.EventPhase)
  phase?: EventPhase;

  @ApiPropertyOptional({ enum: RuntimeEnums.EventStatus, default: "SCHEDULED" })
  @IsOptional()
  @IsIn(RuntimeEnums.EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventCoordinatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tourId?: string;

  // Streaming - Optional
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isVirtual?: boolean;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  geoRestricted?: boolean;

  // Ticketing - Optional
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  ticketRequired?: boolean;

  /** Registration access: OPEN = anyone can register (free events); INVITE_ONLY = must have invitation (default) */
  @ApiPropertyOptional({ enum: ["OPEN", "INVITE_ONLY"] })
  @IsOptional()
  @IsIn(["OPEN", "INVITE_ONLY"])
  registrationAccess?: "OPEN" | "INVITE_ONLY";

  @ApiPropertyOptional({ type: [TicketTypeDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeDto)
  ticketTypes?: TicketTypeDto[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  entryCodeRequired?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  entryCodeDelivery?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ticketEmailTemplate?: string;

  // Event Management - Optional
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  testingEnabled?: boolean;

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

