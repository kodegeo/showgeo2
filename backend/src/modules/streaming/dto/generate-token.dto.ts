import { IsEnum, IsOptional, IsString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum StreamRole {
  VIEWER = "VIEWER",
  BROADCASTER = "BROADCASTER",
}

export class GenerateTokenDto {
  // eventId comes from route parameter, not request body
  // Controller sets it: generateTokenDto.eventId = eventId (from @Param)
  // Mark as optional so validation doesn't fail when missing from body
  @ApiPropertyOptional({ description: "Set by controller from route parameter" })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ enum: StreamRole, default: StreamRole.VIEWER })
  @IsEnum(StreamRole)
  streamRole: StreamRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  timezone?: string;
}
