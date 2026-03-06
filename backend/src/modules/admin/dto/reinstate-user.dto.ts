import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for reinstating a user (ADMIN only)
 */
export class ReinstateUserDto {
  @ApiProperty({
    description: "Reason for reinstatement (required for audit trail)",
    example: "Issue resolved after review",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}

