import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsNotEmpty, MinLength } from "class-validator";

export class DemoteAdminDto {
  @ApiProperty({
    description: "Reason for demoting ADMIN user to USER role",
    example: "User no longer requires administrative access",
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: "Reason must be at least 10 characters long" })
  reason: string;
}


