import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsEnum, IsArray, IsOptional, IsString } from "class-validator";
import { EventAccessRole, EventOperationalRole } from "@prisma/client";

export class UpsertEventRoleDto {
  @ApiPropertyOptional({ enum: ["OWNER", "ADMIN", "EDITOR", "VIEWER"] })
  @IsOptional()
  @IsEnum(EventAccessRole)
  accessRole?: EventAccessRole;

  @ApiPropertyOptional({ enum: ["BROADCASTER", "COORDINATOR", "MODERATOR"], isArray: true })
  @IsOptional()
  @IsArray()
  @IsEnum(EventOperationalRole, { each: true })
  operationalRoles?: EventOperationalRole[];
}

export class UpsertEventRoleBodyDto extends UpsertEventRoleDto {
  @ApiPropertyOptional({ description: "User ID to assign role for (required for POST)" })
  @IsString()
  userId!: string;
}
