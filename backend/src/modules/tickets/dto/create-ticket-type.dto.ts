import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsInt,
  Min,
  MaxLength,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class CreateTicketTypeDto {
  @ApiProperty({ description: "Display name for this ticket tier" })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({ description: "Price in major units (e.g. dollars)" })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ description: "Max number of sales; omit for unlimited" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  capacity?: number;

  @ApiPropertyOptional({ default: "PUBLIC" })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  visibility?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresInvite?: boolean;
}
