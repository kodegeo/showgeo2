import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsBoolean, IsOptional, IsString } from "class-validator";
import { Type } from "class-transformer";
import { RuntimeEnums, AssetType, AssetOwnerType } from "../../../common/runtime-enums";

export class AssetQueryDto {
  @ApiPropertyOptional({ description: "Page number", default: 1 })
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ description: "Items per page", default: 20 })
  @Type(() => Number)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: "Filter by asset type", enum: RuntimeEnums.AssetType })
  @IsIn(RuntimeEnums.AssetType)
  @IsOptional()
  type?: AssetType;

  @ApiPropertyOptional({ description: "Filter by owner type", enum: RuntimeEnums.AssetOwnerType })
  @IsIn(RuntimeEnums.AssetOwnerType)
  @IsOptional()
  ownerType?: AssetOwnerType;

  @ApiPropertyOptional({ description: "Filter by owner ID" })
  @IsString()
  @IsOptional()
  ownerId?: string;

  @ApiPropertyOptional({ description: "Filter by public visibility" })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}





