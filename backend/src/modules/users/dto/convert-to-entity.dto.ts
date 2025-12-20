import { IsString, IsNotEmpty, IsIn, IsOptional, IsArray, MinLength, MaxLength, Matches } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, EntityType } from "../../../common/runtime-enums";

export class ConvertToEntityDto {
  @ApiProperty({ description: "Entity name", example: "My Music Band" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: "URL-safe identifier", example: "my-music-band" })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^[a-z0-9-]+$/, {
    message: "Slug must contain only lowercase letters, numbers, and hyphens",
  })
  slug: string;

  @ApiProperty({ description: "Entity type", enum: RuntimeEnums.EntityType, example: "INDIVIDUAL" })
  @IsIn(RuntimeEnums.EntityType)
  type: EntityType;

  @ApiPropertyOptional({ description: "Entity bio", example: "A talented music band" })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  bio?: string;

  @ApiPropertyOptional({ description: "Entity tags", example: ["music", "rock", "band"] })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiPropertyOptional({ description: "Profile thumbnail URL" })
  @IsString()
  @IsOptional()
  thumbnail?: string;

  @ApiPropertyOptional({ description: "Banner image URL" })
  @IsString()
  @IsOptional()
  bannerImage?: string;

  @ApiPropertyOptional({ description: "Location", example: "Los Angeles, CA" })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ description: "Website URL" })
  @IsString()
  @IsOptional()
  website?: string;

  @ApiPropertyOptional({ description: "Social links", example: { twitter: "@myband", instagram: "@myband" } })
  @IsOptional()
  socialLinks?: Record<string, string>;

  @ApiPropertyOptional({ description: "Whether entity is public", default: true })
  @IsOptional()
  isPublic?: boolean;
}

