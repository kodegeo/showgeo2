import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for disabling an entity (ADMIN only)
 */
export class DisableEntityDto {
  @ApiProperty({
    description: "Reason for disabling entity (required for audit trail)",
    example: "Violation of platform policies - repeated copyright infringement",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}

