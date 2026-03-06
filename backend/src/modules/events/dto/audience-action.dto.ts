import { IsUUID, IsOptional, IsString, IsEnum } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export enum AudienceActionType {
  SEND_REMINDER = "SEND_REMINDER",
  INVITE_AUDIENCE = "INVITE_AUDIENCE",
  SCHEDULE_REMINDER = "SCHEDULE_REMINDER",
}

export class AudienceActionDto {
  @ApiProperty({ enum: AudienceActionType })
  @IsEnum(AudienceActionType)
  actionType: AudienceActionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string; // Optional custom message

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  scheduledFor?: string; // For scheduled reminders (ISO date string)
}
