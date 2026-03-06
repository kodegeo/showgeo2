import { IsString, IsNotEmpty, IsOptional, IsUUID, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for creating an admin report (authenticated users)
 */
export class CreateAdminReportDto {
  @ApiProperty({
    description: "Report message describing the issue",
    example: "This entity is posting inappropriate content",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Message must be at least 10 characters long" })
  message: string;

  @ApiPropertyOptional({
    description: "Entity ID if report is about an entity",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  entityId?: string;

  @ApiPropertyOptional({
    description: "Event ID if report is about an event",
    type: String,
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;
}

