import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import { AuthService } from "../../modules/auth/auth.service";

/**
 * Attaches `req.user` when a valid Bearer token is present; otherwise continues without user.
 * Use with `@Public()` for routes that work for anonymous and authenticated clients.
 */
@Injectable()
export class OptionalSupabaseAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers?.authorization as string | undefined;
    if (!authHeader?.startsWith("Bearer ")) {
      return true;
    }
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      return true;
    }
    try {
      const user = await this.authService.verifySupabaseToken(token);
      if (user) {
        req.user = user;
      }
    } catch {
      // Invalid token — treat as anonymous
    }
    return true;
  }
}
