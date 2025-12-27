import { SetMetadata } from "@nestjs/common";

/**
 * Decorator to mark endpoints as DEV-only.
 * Use with a guard to prevent access in production.
 */
export const DEV_ONLY = "dev-only";
export const DevOnly = () => SetMetadata(DEV_ONLY, true);




