import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsBoolean, IsOptional, IsString, IsObject } from "class-validator";
import { AssetType, AssetOwnerType } from "@prisma/client";

export enum MediaPurpose {
  THUMBNAIL = "THUMBNAIL",
  BANNER = "BANNER",
  GALLERY = "GALLERY",
  AVATAR = "AVATAR",
  EVENT_MEDIA = "EVENT_MEDIA",
  PRODUCT_IMAGE = "PRODUCT_IMAGE",
  OTHER = "OTHER",
}

export class UploadCreatorMediaDto {
  @ApiProperty({ description: "Asset type", enum: AssetType, example: AssetType.IMAGE })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({ description: "Entity ID (creator/organization)" })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({
    description: "Media purpose",
    enum: MediaPurpose,
    example: MediaPurpose.GALLERY,
    default: MediaPurpose.GALLERY,
  })
  @IsEnum(MediaPurpose)
  @IsOptional()
  purpose?: MediaPurpose;

  @ApiPropertyOptional({ description: "Whether asset is public", default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}













