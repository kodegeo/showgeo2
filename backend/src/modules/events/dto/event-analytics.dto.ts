import { ApiProperty } from "@nestjs/swagger";

export class EventAnalyticsDto {
  @ApiProperty({ description: "Total number of registrations for this event" })
  registrationsCount: number;

  @ApiProperty({ description: "Total number of tickets issued for this event" })
  ticketsIssued: number;

  @ApiProperty({ description: "Number of viewers who joined the stream" })
  viewersJoined: number;

  @ApiProperty({ description: "Join rate as percentage (viewersJoined / ticketsIssued * 100)" })
  joinRate: number;

  @ApiProperty({ description: "Number of guest viewers (no userId) who joined" })
  guestViewers: number;

  @ApiProperty({ description: "Number of logged-in viewers (with userId) who joined" })
  loggedInViewers: number;

  @ApiProperty({ description: "Number of 10-minute reminder notifications sent" })
  remindersSent10Min: number;

  @ApiProperty({ description: "Number of 30-minute reminder notifications sent" })
  remindersSent30Min: number;
}

