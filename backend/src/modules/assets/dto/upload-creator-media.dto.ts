import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsEnum, IsBoolean, IsOptional, IsString, IsObject } from "class-validator";
import { RuntimeEnums, AssetType } from "../../../common/runtime-enums";

export enum MediaPurpose {
  THUMBNAIL = "THUMBNAIL",
  BANNER = "BANNER",
  GALLERY = "GALLERY",
  AVATAR = "AVATAR",
  EVENT_MEDIA = "EVENT_MEDIA",
  PRODUCT_IMAGE = "PRODUCT_IMAGE",
  OTHER = "OTHER",
}

// Runtime-safe enum values for decorators (prevents tree-shaking)
const MediaPurposeValues = Object.values(MediaPurpose);

export class UploadCreatorMediaDto {
  @ApiProperty({ description: "Asset type", enum: RuntimeEnums.AssetType, example: "IMAGE" })
  @IsIn(RuntimeEnums.AssetType)
  type: AssetType;

  @ApiProperty({ description: "Entity ID (creator/organization)" })
  @IsString()
  entityId: string;

  @ApiPropertyOptional({
    description: "Media purpose",
    enum: MediaPurposeValues,
    example: MediaPurpose.GALLERY,
    default: MediaPurpose.GALLERY,
  })
  @IsEnum(MediaPurposeValues)
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













