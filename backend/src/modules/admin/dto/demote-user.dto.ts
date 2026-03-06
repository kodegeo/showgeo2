import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for demoting a user from ENTITY role (ADMIN only)
 */
export class DemoteUserDto {
  @ApiProperty({
    description: "Reason for demotion (required for audit trail)",
    example: "Creator status revoked due to policy violation",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






