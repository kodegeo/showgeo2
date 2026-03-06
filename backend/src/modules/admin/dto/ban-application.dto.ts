import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for banning an entity application (ADMIN only)
 * This action is IRREVERSIBLE and permanently bans the user from reapplying.
 */
export class BanApplicationDto {
  @ApiProperty({
    description: "Reason for ban (required for audit trail)",
    example: "Violation of platform terms and creator guidelines",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






