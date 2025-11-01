import { IsEnum, IsArray, IsUUID, IsOptional, ValidateNested, IsString, IsNumber, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { OrderType } from "@prisma/client";

export class CheckoutItemDto {
  @ApiProperty()
  @IsUUID()
  ticketId?: string;

  @ApiProperty()
  @IsUUID()
  productId?: string;

  @ApiProperty()
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;
}

export class CreateCheckoutDto {
  @ApiProperty({ enum: OrderType })
  @IsEnum(OrderType)
  type: OrderType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  storeId?: string;

  @ApiProperty({ type: [CheckoutItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutItemDto)
  items: CheckoutItemDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

