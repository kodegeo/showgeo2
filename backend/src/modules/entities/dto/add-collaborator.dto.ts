import { IsIn, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { RuntimeEnums, EntityRoleType } from "../../../common/runtime-enums";

export class AddCollaboratorDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: RuntimeEnums.EntityRoleType })
  @IsIn(RuntimeEnums.EntityRoleType)
  role: EntityRoleType;
}

