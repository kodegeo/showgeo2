import { IsString, IsUUID } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

/**
 * DTO for linking an existing app_users record to a Supabase auth user
 * Used when migrating existing users or fixing authUserId mismatches
 */
export class LinkSupabaseUserDto {
  @ApiProperty({ description: "Supabase auth.users.id (UUID)" })
  @IsString()
  @IsUUID()
  authUserId: string;
}






