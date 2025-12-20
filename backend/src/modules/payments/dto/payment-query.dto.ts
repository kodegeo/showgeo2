import { IsOptional, IsIn, IsUUID, IsNumber } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { RuntimeEnums, OrderStatus, OrderType } from "../../../common/runtime-enums";


export class PaymentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({ enum: RuntimeEnums.OrderStatus })
  @IsOptional()
  @IsIn(RuntimeEnums.OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({ enum: RuntimeEnums.OrderType })
  @IsOptional()
  @IsIn(RuntimeEnums.OrderType)
  type?: OrderType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

