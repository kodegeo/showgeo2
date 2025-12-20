import { IsString, IsOptional, IsIn, IsObject, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, NotificationType } from "../../../common/runtime-enums";

export class BroadcastNotificationDto {
  @ApiProperty()
  @IsUUID()
  entityId: string;

  @ApiProperty({ enum: RuntimeEnums.NotificationType })
  @IsIn(RuntimeEnums.NotificationType)
  type: NotificationType;

  @ApiProperty()
  @IsString()
  message: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

