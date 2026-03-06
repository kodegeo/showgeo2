import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for promoting a user to ENTITY role (ADMIN only)
 */
export class PromoteUserDto {
  @ApiProperty({
    description: "Reason for promotion (required for audit trail)",
    example: "User applied for creator status and was approved",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






