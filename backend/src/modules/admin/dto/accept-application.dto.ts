import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for accepting an entity application (ADMIN only)
 */
export class AcceptApplicationDto {
  @ApiProperty({
    description: "Reason for acceptance (required for audit trail)",
    example: "Application meets all requirements and creator guidelines",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}






