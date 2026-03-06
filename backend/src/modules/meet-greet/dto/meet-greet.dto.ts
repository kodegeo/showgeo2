import { ApiProperty } from "@nestjs/swagger";
import { MeetGreetSession } from "../meet-greet.service";

export class StartNextSessionResponseDto {
  @ApiProperty({ description: "The started session, or null if no pending sessions", required: false })
  session?: MeetGreetSession | null;

  @ApiProperty({ description: "Whether a session was started", example: true })
  started: boolean;

  @ApiProperty({ description: "Optional message", required: false })
  message?: string;
}

