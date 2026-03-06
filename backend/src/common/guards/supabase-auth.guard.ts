import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    ForbiddenException,
  } from "@nestjs/common";
  import { AuthService } from "../../modules/auth/auth.service";
  
  @Injectable()
  export class SupabaseAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) {}
  
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      throw new UnauthorizedException("Invalid Authorization header format");
    }

    try {
      // Validate the token with Supabase Auth
      // This will throw ForbiddenException if user is disabled
      const user = await this.authService.verifySupabaseToken(token);

      if (!user) {
        throw new UnauthorizedException("Invalid or expired token");
      }

      // Attach user record to the request (may be full Prisma user or minimal user object)
      req.user = user;

      return true;
    } catch (error) {
      // Re-throw ForbiddenException (for disabled users) and UnauthorizedException
      if (error instanceof ForbiddenException || error instanceof UnauthorizedException) {
        throw error;
      }
      // For any other errors, throw UnauthorizedException
      throw new UnauthorizedException("Authentication failed");
    }
  }
  }
  