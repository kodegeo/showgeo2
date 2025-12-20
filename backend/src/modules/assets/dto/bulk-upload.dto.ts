import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsIn, IsEnum, IsOptional, IsBoolean, IsString, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { MediaPurpose } from "./upload-creator-media.dto";
import { RuntimeEnums, AssetType } from "../../../common/runtime-enums";

// Runtime-safe enum values for decorators (prevents tree-shaking)
const MediaPurposeValues = Object.values(MediaPurpose);

export class BulkUploadItemDto {
  @ApiProperty({ description: "File index in the files array (0-based)" })
  fileIndex: number;

  @ApiProperty({ description: "Asset type", enum: RuntimeEnums.AssetType })
  @IsIn(RuntimeEnums.AssetType)
  type: AssetType;

  @ApiPropertyOptional({ description: "Media purpose", enum: MediaPurposeValues, default: MediaPurpose.GALLERY })
  @IsEnum(MediaPurposeValues)
  @IsOptional()
  purpose?: MediaPurpose;

  @ApiPropertyOptional({ description: "Additional metadata" })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class BulkUploadDto {
  @ApiProperty({ description: "Entity ID (creator/organization)" })
  @IsString()
  entityId: string;

  @ApiProperty({
    description: "Array of upload items corresponding to files",
    type: [BulkUploadItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkUploadItemDto)
  items: BulkUploadItemDto[];

  @ApiPropertyOptional({ description: "Whether assets are public", default: true })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}













