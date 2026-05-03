import { IsOptional, IsIn, IsString, IsDateString, IsUUID, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RuntimeEnums, EventType, EventPhase, EventStatus, GeofencingAccessLevel } from "../../../common/runtime-enums";

const EVENT_LIST_SORT = ["upcoming", "newest", "trending"] as const;

export class EventQueryDto {
  /** Public list filter (alias of search in controller) */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: EVENT_LIST_SORT })
  @IsOptional()
  @IsIn([...EVENT_LIST_SORT])
  sort?: (typeof EVENT_LIST_SORT)[number];

  @ApiPropertyOptional({ description: 'Pass "true" to filter virtual events only' })
  @IsOptional()
  @IsString()
  virtual?: string;

  @ApiPropertyOptional({ description: 'Pass "true" for VIP / ticket-required emphasis in filters' })
  @IsOptional()
  @IsString()
  vip?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  creatorId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.EventType })
  @IsOptional()
  @IsIn(RuntimeEnums.EventType)
  eventType?: EventType;

  @ApiPropertyOptional({ enum: RuntimeEnums.EventPhase })
  @IsOptional()
  @IsIn(RuntimeEnums.EventPhase)
  phase?: EventPhase;

  @ApiPropertyOptional({ enum: RuntimeEnums.EventStatus })
  @IsOptional()
  @IsIn(RuntimeEnums.EventStatus)
  status?: EventStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isVirtual?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.GeofencingAccessLevel })
  @IsOptional()
  @IsIn(RuntimeEnums.GeofencingAccessLevel)
  streamingAccessLevel?: GeofencingAccessLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

