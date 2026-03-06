import { IsEnum, IsString, IsOptional, IsObject, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventPhase } from "@prisma/client";
import { EventActivityType, ActivityVisibility } from "../../../shared/types/event-activities.types";

export class CreateActivityDto {
  @ApiProperty({ enum: EventPhase, description: "Event phase for this activity" })
  @IsEnum(EventPhase)
  phase: EventPhase;

  @ApiProperty({ enum: EventActivityType, description: "Type of activity" })
  @IsEnum(EventActivityType)
  type: EventActivityType;

  @ApiProperty({ description: "Activity title" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: "Activity description" })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: "Activity-specific configuration (JSON)" })
  @IsObject()
  config: Record<string, any>;

  @ApiProperty({ enum: ActivityVisibility, description: "Who can see this activity" })
  @IsEnum(ActivityVisibility)
  visibility: ActivityVisibility;

  @ApiPropertyOptional({ description: "Activity start time" })
  @IsOptional()
  @Type(() => Date)
  startsAt?: Date;

  @ApiPropertyOptional({ description: "Activity end time" })
  @IsOptional()
  @Type(() => Date)
  endsAt?: Date;
}

