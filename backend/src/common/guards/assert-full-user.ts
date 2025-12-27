import { ForbiddenException } from "@nestjs/common";

/**
 * Asserts that a user record is fully initialized.
 * Throws ForbiddenException if the user is partial (__partial === true).
 * 
 * @param user - The user object to check (may be from @CurrentUser() or req.user)
 * @throws {ForbiddenException} If user is partially initialized
 */
export function assertFullUser(user: any): void {
  if (user?.__partial === true) {
    throw new ForbiddenException(
      "User record not fully initialized. Please complete profile setup.",
    );
  }
}

