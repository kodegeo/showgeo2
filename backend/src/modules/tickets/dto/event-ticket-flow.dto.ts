import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class RegisterFreeDto {
  @ApiProperty({ description: "ticket_types.id for this event" })
  @IsUUID()
  ticketTypeId: string;

  @ApiPropertyOptional({
    description:
      "access_passes.id — required for invite-only tiers or to claim an invite",
  })
  @IsOptional()
  @IsUUID()
  accessPassId?: string;

  @ApiPropertyOptional({
    description: "Access code from email invite (when pass has access_code)",
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  accessCode?: string;
}

export class EventCheckoutDto {
  @ApiProperty()
  @IsUUID()
  ticketTypeId: string;

  @ApiPropertyOptional({
    description: "Invite pass that grants purchase permission for invite-only paid tiers",
  })
  @IsOptional()
  @IsUUID()
  accessPassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessCode?: string;
}

export class ConfirmEventOrderDto {
  @ApiProperty({ description: "orders.id from checkout response" })
  @IsUUID()
  orderId: string;
}
