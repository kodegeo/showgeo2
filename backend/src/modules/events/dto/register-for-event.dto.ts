import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MinLength } from "class-validator";

export class RegisterForEventDto {
  @ApiProperty({ description: "UUID of a ticket_types row for this event" })
  @IsUUID()
  ticketTypeId: string;

  @ApiPropertyOptional({ description: "access_passes.id for invite-only tiers" })
  @IsOptional()
  @IsUUID()
  accessPassId?: string;

  @ApiPropertyOptional({ description: "Code from email invite" })
  @IsOptional()
  @IsString()
  @MinLength(4)
  accessCode?: string;
}

export class ClaimInviteDto {
  @ApiProperty({ description: "Access code from event_registrations" })
  @IsString()
  @MinLength(1)
  accessCode: string;
}
