import { IsEnum, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { EntityRoleType } from "@prisma/client";

export class AddCollaboratorDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: EntityRoleType })
  @IsEnum(EntityRoleType)
  role: EntityRoleType;
}

