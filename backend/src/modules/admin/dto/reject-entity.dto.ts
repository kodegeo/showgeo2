import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for rejecting an entity (ADMIN only)
 */
export class RejectEntityDto {
  @ApiProperty({
    description: "Reason for rejection (required for audit trail)",
    example: "Entity application does not meet platform requirements",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






