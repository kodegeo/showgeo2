import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for enabling a user (ADMIN only)
 */
export class EnableUserDto {
  @ApiProperty({
    description: "Reason for enabling the user (required for audit trail)",
    example: "User account re-enabled after review",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






