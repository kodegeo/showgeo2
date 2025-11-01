import { IsUUID, IsOptional, IsNumber, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRefundDto {
  @ApiProperty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  amountPercent?: number; // Percentage to refund (0-100), if not provided, full refund

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  reason?: string;
}

