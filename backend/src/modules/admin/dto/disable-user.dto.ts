import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for disabling a user (ADMIN only)
 */
export class DisableUserDto {
  @ApiProperty({
    description: "Reason for disabling the user (required for audit trail)",
    example: "User account disabled due to security concerns",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






