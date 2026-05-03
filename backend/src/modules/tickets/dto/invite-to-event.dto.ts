import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsArray, IsEmail, IsIn, IsOptional, IsUUID, ValidateIf } from "class-validator";

export class InviteToEventDto {
  @ApiProperty({ enum: ["FOLLOWERS", "EMAIL"] })
  @IsIn(["FOLLOWERS", "EMAIL"])
  type: "FOLLOWERS" | "EMAIL";

  @ApiPropertyOptional({
    description: "Required when type is EMAIL — list of recipient emails",
  })
  @ValidateIf((o: InviteToEventDto) => o.type === "EMAIL")
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[];

  @ApiProperty()
  @IsUUID()
  ticketTypeId: string;
}

export class InviteFollowersDto {
  @ApiProperty()
  @IsUUID()
  ticketTypeId: string;

  @ApiPropertyOptional({ type: [String], description: "Specific follower user IDs; omit to invite all entity followers" })
  @IsOptional()
  @IsArray()
  @IsUUID(undefined, { each: true })
  followerIds?: string[];

  @ApiPropertyOptional({ type: [String], description: "Additional email recipients" })
  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  emails?: string[];
}
