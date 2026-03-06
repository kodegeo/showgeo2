import { IsString, IsNotEmpty, MinLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for reinstating an entity (ADMIN only)
 */
export class ReinstateEntityDto {
  @ApiProperty({
    description: "Reason for reinstatement (required for audit trail)",
    example: "Issue resolved after review and compliance verification",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}

