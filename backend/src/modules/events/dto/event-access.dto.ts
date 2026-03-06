import { ApiPropertyOptional } from "@nestjs/swagger";

export class EventAccessDto {
  @ApiPropertyOptional({ enum: ["OWNER", "ADMIN", "EDITOR", "VIEWER"] })
  accessRole?: string;

  @ApiPropertyOptional({ enum: ["BROADCASTER", "COORDINATOR", "MODERATOR"], isArray: true })
  operationalRoles?: string[];
}
