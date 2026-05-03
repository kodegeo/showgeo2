import { ApiProperty } from "@nestjs/swagger";
import { IsString, MinLength } from "class-validator";

export class AccessPassByCodeQueryDto {
  @ApiProperty({ description: "Unique access_code value" })
  @IsString()
  @MinLength(1)
  code: string;
}
