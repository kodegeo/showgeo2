import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsBoolean, IsOptional, IsString, IsObject } from "class-validator";
import { Transform } from "class-transformer";
import { RuntimeEnums, AssetType, AssetOwnerType } from "../../../common/runtime-enums";

export class UploadAssetDto {
  @ApiProperty({ description: "Asset type", enum: RuntimeEnums.AssetType, example: "IMAGE" })
  @IsIn(RuntimeEnums.AssetType)
  type: AssetType;

  @ApiProperty({ description: "Owner type", enum: RuntimeEnums.AssetOwnerType, example: "USER" })
  @IsIn(RuntimeEnums.AssetOwnerType)
  ownerType: AssetOwnerType;

  @ApiProperty({ description: "Owner ID (user or entity ID)" })
  @IsString()
  ownerId: string;

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








