import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
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
  
      // Validate the token with Supabase Auth
      const user = await this.authService.verifySupabaseToken(token);
  
      if (!user) {
        throw new UnauthorizedException("Invalid or expired token");
      }
  
      // Attach Prisma user record to the request
      req.user = user;
  
      return true;
    }
  }
  