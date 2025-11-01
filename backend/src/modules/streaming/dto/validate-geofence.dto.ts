import { IsString, IsOptional } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class ValidateGeofenceDto {
  @ApiProperty()
  @IsString()
  sessionId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string; // ISO country code (e.g., "US")

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string; // State name (e.g., "California")

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string; // City name (e.g., "Los Angeles")

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string; // Timezone (e.g., "America/Los_Angeles" or "EST")

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  region?: string; // Legacy field for simple region string
}

