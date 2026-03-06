import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for approving an entity (ADMIN only)
 */
export class ApproveEntityDto {
  @ApiProperty({
    description: "Reason for approval (required for audit trail)",
    example: "Entity application meets all requirements",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}




