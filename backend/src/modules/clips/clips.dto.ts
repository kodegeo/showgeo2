import { IsNumber, IsOptional, IsString, Min, Max } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class CreateClipDto {
  @ApiPropertyOptional({ description: "Start time in seconds" })
  @IsNumber()
  @Min(0)
  startTime: number;

  @ApiPropertyOptional({ description: "Duration in seconds" })
  @IsNumber()
  @Min(1)
  @Max(600)
  duration: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class ShareClipDto {
  @ApiPropertyOptional({ description: "Target platform: twitter, facebook, linkedin" })
  @IsOptional()
  @IsString()
  platform?: string;
}
