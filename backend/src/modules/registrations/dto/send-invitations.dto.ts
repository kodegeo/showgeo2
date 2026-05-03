import { IsString, IsArray, IsOptional, IsEmail, IsUUID, ValidateNested, IsIn } from "class-validator";
import { Type, Transform } from "class-transformer";
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
  @ApiPropertyOptional({ enum: ["FOLLOWERS", "EMAIL_LIST"], description: "FOLLOWERS = all entity followers; EMAIL_LIST = use emails[]" })
  @IsOptional()
  @IsIn(["FOLLOWERS", "EMAIL_LIST"])
  audience?: "FOLLOWERS" | "EMAIL_LIST";

  @ApiPropertyOptional({ type: [String], description: "Required when audience is EMAIL_LIST" })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[];

  @ApiPropertyOptional({ type: [InviteeDto], description: "Specific invitees when audience is omitted (legacy)" })
  @IsOptional()
  @Transform(({ value }) => (value === undefined || value === null ? [] : value))
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InviteeDto)
  invitees?: InviteeDto[];

  @ApiPropertyOptional({ enum: ["FREE", "TICKET"] })
  @IsOptional()
  @IsIn(["FREE", "TICKET"])
  accessType?: "FREE" | "TICKET";

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  ticketTypeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;
}
