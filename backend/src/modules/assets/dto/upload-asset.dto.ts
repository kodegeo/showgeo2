import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsBoolean, IsOptional, IsString, IsObject, ValidateIf } from "class-validator";
import { Transform } from "class-transformer";
import { RuntimeEnums, AssetType, AssetOwnerType } from "../../../common/runtime-enums";

export class UploadAssetDto {
  @ApiProperty({ description: "Asset type", enum: RuntimeEnums.AssetType, example: "IMAGE" })
  @IsIn(RuntimeEnums.AssetType)
  type: AssetType;

  @ApiPropertyOptional({ description: "Owner type (required when eventId is not set)", enum: RuntimeEnums.AssetOwnerType, example: "USER" })
  @ValidateIf((o) => !o.eventId)
  @IsIn(RuntimeEnums.AssetOwnerType)
  ownerType?: AssetOwnerType;

  @ApiPropertyOptional({ description: "Owner ID (required when eventId is not set)" })
  @ValidateIf((o) => !o.eventId)
  @IsString()
  ownerId?: string;

  /** When set, upload is stored at events/{eventId}/thumbnail.{ext} and event access is validated. Use with type IMAGE for event thumbnails. */
  @ApiPropertyOptional({ description: "Event ID for event-scoped upload (e.g. event thumbnail)" })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiPropertyOptional({ description: "Whether asset is public", default: false })
  @Transform(({ value }) => {
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: "Additional metadata (can be JSON string or object)" })
  @Transform(({ value }) => {
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value;
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}








