import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

/** One tier from Studio UI (matches TicketTypeDto contract) */
export class TicketTierInputDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  price: number;

  @ApiPropertyOptional({ default: "USD" })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  quantity: number;

  @ApiProperty({ enum: ["GENERAL", "VIP"] })
  @IsIn(["GENERAL", "VIP"])
  accessLevel: "GENERAL" | "VIP";

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  requiresInvite?: boolean;
}

export class SaveTicketTypesDto {
  @ApiProperty({ type: [TicketTierInputDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TicketTierInputDto)
  ticketTypes: TicketTierInputDto[];
}
