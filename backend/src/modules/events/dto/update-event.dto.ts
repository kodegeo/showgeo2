import { PartialType } from "@nestjs/swagger";
import { IsOptional, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { CreateEventDto } from "./create-event.dto";
import { LiveIntroductionDto } from "./live-introduction.dto";

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ type: LiveIntroductionDto, description: "Live Introduction configuration" })
  @IsOptional()
  @ValidateNested()
  @Type(() => LiveIntroductionDto)
  liveIntroduction?: LiveIntroductionDto;
}

