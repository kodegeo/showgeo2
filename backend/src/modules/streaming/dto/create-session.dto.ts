import { IsString, IsOptional, IsEnum, IsObject, IsArray } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum AccessLevel {
  PUBLIC = "PUBLIC",
  REGISTERED = "REGISTERED",
  TICKETED = "TICKETED",
}

export class CreateSessionDto {
  @ApiProperty()
  @IsString()
  eventId: string;

  @ApiPropertyOptional({ enum: AccessLevel, default: AccessLevel.PUBLIC })
  @IsOptional()
  @IsEnum(AccessLevel)
  accessLevel?: AccessLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoRegions?: string[];
}

