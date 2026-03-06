import { IsString, IsOptional, MinLength } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

/**
 * DTO for resolving an admin report (ADMIN only)
 */
export class ResolveAdminReportDto {
  @ApiPropertyOptional({
    description: "Optional resolution notes",
    example: "Issue reviewed and resolved",
    minLength: 5,
  })
  @IsOptional()
  @IsString()
  @MinLength(5, { message: "Resolution notes must be at least 5 characters long" })
  resolutionNotes?: string;
}

