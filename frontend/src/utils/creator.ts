import type { User } from "../../../packages/shared/types";
import { UserRole } from "../../../packages/shared/types";

/**
 * Check if a user is a creator
 *
 * A user is considered a creator if:
 * - They have role === ENTITY (system-level creator), OR
 * - They own or manage at least one entity (hasEntities === true)
 *
 * NOTE:
 * Entity relationships are resolved outside this function
 * via useUserEntities() or EntityContext.
 */
export function isCreator(
  user: User | null | undefined,
  hasEntities: boolean = false,
): boolean {
  if (!user) return false;

  // Explicit creator role
  if (user.role === UserRole.ENTITY) {
    return true;
  }

  // Owns or manages at least one entity
  return hasEntities;
}



