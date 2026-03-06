import { IsString, IsArray, IsOptional, IsEmail, IsUUID, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class InviteeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class SendInvitationsDto {
  @ApiProperty({ type: [InviteeDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteeDto)
  invitees: InviteeDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}


