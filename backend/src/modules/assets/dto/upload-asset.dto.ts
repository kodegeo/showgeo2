import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsBoolean, IsOptional, IsString, IsObject } from "class-validator";
import { Transform } from "class-transformer";
import { AssetType, AssetOwnerType } from "@prisma/client";

export class UploadAssetDto {
  @ApiProperty({ description: "Asset type", enum: AssetType, example: AssetType.IMAGE })
  @IsEnum(AssetType)
  type: AssetType;

  @ApiProperty({ description: "Owner type", enum: AssetOwnerType, example: AssetOwnerType.USER })
  @IsEnum(AssetOwnerType)
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








