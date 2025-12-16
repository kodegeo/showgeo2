import { IsEmail, IsString, MinLength, IsOptional, IsEnum, IsIn } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { UserRole } from "@prisma/client";

// Extract enum values for validation
const UserRoleValues = Object.values(UserRole) as string[];

export class RegisterDto {
  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ 
    enum: UserRoleValues,
    description: "User role", 
    example: "USER",
    enumName: "UserRole"
  })
  @IsOptional()
  @IsIn(UserRoleValues, { 
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

