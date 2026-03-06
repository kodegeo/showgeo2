import { IsString, IsOptional, IsEmail, IsUUID } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class RegisterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  registrationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  accessCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}


