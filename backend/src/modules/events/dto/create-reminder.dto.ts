import { IsEnum, IsString, IsDateString, IsOptional, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum ReminderType {
  FOLLOWERS = "FOLLOWERS",
  TICKET_HOLDERS = "TICKET_HOLDERS",
  CUSTOM = "CUSTOM",
}

export class CreateReminderDto {
  @ApiProperty({ enum: ReminderType })
  @IsEnum(ReminderType)
  type: ReminderType;

  @ApiProperty({ description: "ISO date string for when the reminder should be sent" })
  @IsDateString()
  scheduledFor: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  messageTemplate?: string;
}
