import { IsString, IsOptional, IsIn, IsBoolean, IsArray, IsObject, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, EntityType } from "../../../common/runtime-enums";

export class CreateEntityDto {
  @ApiProperty({ enum: RuntimeEnums.EntityType, default: "INDIVIDUAL" })
  @IsIn(RuntimeEnums.EntityType)
  type: EntityType;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  thumbnail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  socialLinks?: Record<string, string>;

  @ApiProperty({ default: true })
  @IsBoolean()
  isPublic: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  defaultCoordinatorId?: string;
}

