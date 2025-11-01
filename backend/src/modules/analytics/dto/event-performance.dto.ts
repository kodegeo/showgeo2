import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class EventPerformanceDto {
  @ApiProperty()
  viewers: number;

  @ApiProperty()
  participants: number;

  @ApiProperty()
  messages: number;

  @ApiProperty()
  reactions: number;

  @ApiProperty()
  ticketsSold: number;

  @ApiProperty()
  ticketRevenue: number;

  @ApiProperty()
  duration: number; // in seconds

  @ApiProperty()
  peakViewers: number;

  @ApiPropertyOptional()
  trend?: {
    date: string;
    viewers: number;
    messages: number;
    reactions: number;
  }[];
}

