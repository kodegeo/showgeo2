import { IsIn, IsOptional, IsDateString } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, EventPhase } from "../../../common/runtime-enums";

export class PhaseTransitionDto {
  @ApiProperty({ enum: RuntimeEnums.EventPhase })
  @IsIn(RuntimeEnums.EventPhase)
  phase: EventPhase;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledTime?: string;
}

