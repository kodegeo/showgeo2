import { IsEnum, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventPhase } from "./create-event.dto";

export class PhaseTransitionDto {
  @ApiProperty({ enum: EventPhase })
  @IsEnum(EventPhase)
  phase: EventPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

