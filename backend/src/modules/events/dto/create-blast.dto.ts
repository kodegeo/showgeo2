import { IsEnum, IsString, IsNotEmpty } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export enum BlastAudienceType {
  FOLLOWERS = "FOLLOWERS",
  TICKET_HOLDERS = "TICKET_HOLDERS",
  CUSTOM = "CUSTOM",
}

export enum BlastChannelType {
  IN_APP = "IN_APP",
  EMAIL = "EMAIL",
}

export class CreateBlastDto {
  @ApiProperty({ enum: BlastAudienceType })
  @IsEnum(BlastAudienceType)
  audience: BlastAudienceType;

  @ApiProperty({ enum: BlastChannelType })
  @IsEnum(BlastChannelType)
  channel: BlastChannelType;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  message: string;
}
