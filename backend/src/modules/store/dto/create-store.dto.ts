import { IsString, IsOptional, IsIn, IsBoolean, IsArray, IsUUID, MaxLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, StoreStatus, StoreVisibility } from "../../../common/runtime-enums";

export class CreateStoreDto {
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
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bannerImage?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.StoreStatus, default: "ACTIVE" })
  @IsOptional()
  @IsIn(RuntimeEnums.StoreStatus)
  status?: StoreStatus;

  @ApiPropertyOptional({ enum: RuntimeEnums.StoreVisibility, default: "PUBLIC" })
  @IsOptional()
  @IsIn(RuntimeEnums.StoreVisibility)
  visibility?: StoreVisibility;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  collaborators?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  tourId?: string;
}

