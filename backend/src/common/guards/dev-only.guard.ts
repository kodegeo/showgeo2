import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DEV_ONLY } from "../decorators/dev-only.decorator";

@Injectable()
export class DevOnlyGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isDevOnly = this.reflector.getAllAndOverride<boolean>(DEV_ONLY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isDevOnly) {
      return true; // Not a dev-only endpoint, allow access
    }

    // Check if we're in development mode
    const isDevelopment =
      process.env.NODE_ENV === "development" ||
      process.env.NODE_ENV === "dev" ||
      !process.env.NODE_ENV;

    if (!isDevelopment) {
      throw new ForbiddenException(
        "This endpoint is only available in development mode",
      );
    }

    return true;
  }
}




