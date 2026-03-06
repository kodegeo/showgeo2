import { ApiProperty } from "@nestjs/swagger";

export class FanVipJoinResponseDto {
  @ApiProperty({
    description: "VIP room name (deterministic format: vip-event-{eventId}-session-{sessionId})",
    example: "vip-event-abc123-session-xyz789",
  })
  roomName: string;

  @ApiProperty({
    description: "LiveKit JWT access token for VIP room",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  livekitToken: string;

  @ApiProperty({
    description: "Token expiration timestamp",
    example: "2024-01-15T10:30:00.000Z",
  })
  expiresAt: Date;
}

export class ArtistVipJoinResponseDto {
  @ApiProperty({
    description: "VIP room name (deterministic format: vip-event-{eventId}-session-{sessionId})",
    example: "vip-event-abc123-session-xyz789",
  })
  roomName: string;

  @ApiProperty({
    description: "LiveKit JWT access token for VIP room",
    example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  })
  livekitToken: string;

  @ApiProperty({
    description: "Token expiration timestamp",
    example: "2024-01-15T10:30:00.000Z",
  })
  expiresAt: Date;

  @ApiProperty({
    description: "Current active session ID",
    example: "session-xyz789",
  })
  sessionId: string;
}

