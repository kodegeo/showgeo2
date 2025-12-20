import { IsEmail, IsString, MinLength, IsOptional, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RuntimeEnums, UserRole } from "../../../common/runtime-enums";

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ 
    enum: RuntimeEnums.UserRole,
    description: "User role", 
    example: "USER",
    enumName: "UserRole"
  })
  @IsOptional()
  @IsIn(RuntimeEnums.UserRole, { 
    message: "Role must be one of: USER, ENTITY, MANAGER, COORDINATOR, ADMIN"
  })
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;
}

