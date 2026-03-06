import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsEnum,
  IsOptional,
  IsUUID,
  IsNotEmpty,
} from "class-validator";
import {
  ModerationReason,
  ModerationRoleContext,
} from "@prisma/client";

export class CreateReportDto {
  @ApiProperty({
    description: "ID of the activity being reported (optional)",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  activityId?: string;

  @ApiProperty({
    description: "ID of the meet & greet session being reported (optional)",
    required: false,
  })
  @IsOptional()
  @IsUUID()
  meetGreetSessionId?: string;

  @ApiProperty({
    description: "ID of the user being reported",
    required: true,
  })
  @IsNotEmpty()
  @IsUUID()
  reportedUserId: string;

  @ApiProperty({
    description: "Context of the report (who is reporting whom)",
    enum: ModerationRoleContext,
    required: true,
  })
  @IsEnum(ModerationRoleContext)
  roleContext: ModerationRoleContext;

  @ApiProperty({
    description: "Reason for the report",
    enum: ModerationReason,
    required: true,
  })
  @IsEnum(ModerationReason)
  reason: ModerationReason;

  @ApiProperty({
    description: "Additional description of the incident (optional)",
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
}

