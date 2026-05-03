import {
  IsString,
  IsOptional,
  IsDateString,
  IsArray,
  IsBoolean,
  IsUUID,
  IsIn,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

const TOUR_STATUS = ["DRAFT", "UPCOMING", "ACTIVE", "COMPLETED"] as const;
const STREAMING_ACCESS_LEVEL = ["PUBLIC", "REGISTERED", "TICKETED"] as const;

export class CreateTourDto {
  @ApiProperty()
  @IsUUID()
  primaryEntityId: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ enum: TOUR_STATUS })
  @IsOptional()
  @IsIn(TOUR_STATUS)
  status?: (typeof TOUR_STATUS)[number];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  geoRestricted?: boolean;

  @ApiPropertyOptional({ enum: STREAMING_ACCESS_LEVEL })
  @IsOptional()
  @IsIn(STREAMING_ACCESS_LEVEL)
  streamingAccessLevel?: (typeof STREAMING_ACCESS_LEVEL)[number];

  @ApiPropertyOptional({ type: [String], default: [] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  geoRegions?: string[];
}
