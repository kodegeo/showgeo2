import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for terminating an event (ADMIN only - kill switch)
 */
export class TerminateEventDto {
  @ApiProperty({
    description: "Reason for termination (required for audit trail)",
    example: "Violation of platform policies - inappropriate content during live stream",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}

