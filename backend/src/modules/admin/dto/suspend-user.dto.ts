import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for suspending a user (ADMIN only)
 */
export class SuspendUserDto {
  @ApiProperty({
    description: "Reason for suspension (required for audit trail)",
    example: "Violation of terms of service - inappropriate content",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}

