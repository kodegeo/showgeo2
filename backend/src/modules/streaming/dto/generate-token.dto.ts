import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ParticipantRole {
  HOST = "HOST",
  COORDINATOR = "COORDINATOR",
  VIEWER = "VIEWER",
}

export class GenerateTokenDto {
  @ApiProperty({ enum: ParticipantRole, default: ParticipantRole.VIEWER })
  @IsEnum(ParticipantRole)
  role: ParticipantRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identity?: string; // Custom identity/name for participant

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string; // User's country code (e.g., "US") for geofence validation

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string; // User's state (e.g., "California") for geofence validation

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string; // User's city (e.g., "Los Angeles") for geofence validation

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string; // User's timezone (e.g., "America/Los_Angeles") for geofence validation
}

