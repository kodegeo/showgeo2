import { IsOptional, IsIn, IsString, IsDateString, IsUUID, IsBoolean } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RuntimeEnums, EventType, EventPhase, EventStatus, GeofencingAccessLevel } from "../../../common/runtime-enums";

export class EventQueryDto {
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

