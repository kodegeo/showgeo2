import { IsNumber, IsOptional, IsString, IsUUID, Min, Max } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateRevenueSplitDto {
  @ApiProperty({ description: "Entity ID of the collaborator (event owner or event collaborator)" })
  @IsUUID()
  collaboratorId: string;

  @ApiProperty({ minimum: 0, maximum: 100, description: "Share percentage (0-100). Total of all splits must not exceed 100%." })
  @IsNumber()
  @Min(0)
  @Max(100)
  sharePercent: number;

  @ApiPropertyOptional({ example: "Headliner", description: "Role label (e.g. Headliner, Venue, Promoter)" })
  @IsOptional()
  @IsString()
  role?: string;
}
