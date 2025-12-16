import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventPhase } from "@prisma/client";

export class PhaseTransitionDto {
  @ApiProperty({ enum: EventPhase })
  @IsEnum(EventPhase)
  phase: EventPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

