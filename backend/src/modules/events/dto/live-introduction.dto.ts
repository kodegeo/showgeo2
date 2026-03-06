import { IsBoolean, IsOptional, IsString, IsUrl, ValidateIf } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class LiveIntroductionDto {
  @ApiProperty({ description: "Whether Live Introduction is enabled" })
  @IsBoolean()
  enabled: boolean;

  @ApiPropertyOptional({ description: "MP4 video URL for the introduction video" })
  @IsOptional()
  @ValidateIf((o) => o.enabled === true)
  @IsString()
  @IsUrl({}, { message: "videoUrl must be a valid URL" })
  videoUrl?: string;
}

