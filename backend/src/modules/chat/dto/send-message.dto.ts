import { IsString, IsNotEmpty, MaxLength } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ example: "Hello everyone!" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
