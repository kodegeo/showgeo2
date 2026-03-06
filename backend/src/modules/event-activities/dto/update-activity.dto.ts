import { IsEnum, IsString, IsOptional, IsObject } from "class-validator";
import { Type } from "class-transformer";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { EventActivityType, ActivityVisibility } from "../../../shared/types/event-activities.types";

export class UpdateActivityDto {
  @ApiPropertyOptional({ description: "Activity title" })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: "Activity description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: "Activity-specific configuration (JSON)" })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional({ enum: ActivityVisibility, description: "Who can see this activity" })
  @IsOptional()
  @IsEnum(ActivityVisibility)
  visibility?: ActivityVisibility;

  @ApiPropertyOptional({ description: "Activity start time" })
  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;

  @ApiPropertyOptional({ description: "Activity end time" })
  @IsOptional()
  @Type(() => Date)
  endsAt?: Date;
}

