/**
 * Authentication utility functions
 */

/**
 * Check if user has required role(s)
 */
export function hasRole(userRole: string, requiredRoles: string[]): boolean {
  return requiredRoles.includes(userRole);
}

/**
 * Check if user is admin
 */
export function isAdmin(userRole: string): boolean {
  return userRole === "ADMIN";
}

/**
 * Check if user is entity
 */
export function isEntity(userRole: string): boolean {
  return userRole === "ENTITY";
}

/**
 * Get redirect path based on user role
 */
export function getRoleRedirectPath(userRole: string): string {
  switch (userRole) {
    case "ADMIN":
      return "/admin";
    case "ENTITY":
      return "/dashboard";
    case "USER":
      return "/dashboard";
    default:
      return "/";
  }
}












