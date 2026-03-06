import { ApiProperty } from "@nestjs/swagger";
import { IsEnum } from "class-validator";
import { ModerationStatus } from "@prisma/client";

export class UpdateReportStatusDto {
  @ApiProperty({
    description: "New status for the report",
    enum: ModerationStatus,
    required: true,
  })
  @IsEnum(ModerationStatus)
  status: ModerationStatus;
}

