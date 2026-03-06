import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for rejecting an entity application (ADMIN only)
 */
export class RejectApplicationDto {
  @ApiProperty({
    description: "Reason for rejection (required for audit trail)",
    example: "Application does not meet creator requirements",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






