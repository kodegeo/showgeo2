import { IsOptional, IsIn, IsString, IsBoolean, IsUUID } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RuntimeEnums, StoreStatus, StoreVisibility } from "../../../common/runtime-enums";

export class StoreQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tourId?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.StoreStatus })
  @IsOptional()
  @IsIn(RuntimeEnums.StoreStatus)
  status?: StoreStatus;

  @ApiPropertyOptional({ enum: RuntimeEnums.StoreVisibility })
  @IsOptional()
  @IsIn(RuntimeEnums.StoreVisibility)
  visibility?: StoreVisibility;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  tag?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

