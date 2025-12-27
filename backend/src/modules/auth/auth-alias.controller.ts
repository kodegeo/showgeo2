import {
  Controller,
  Get,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { CurrentUser } from "../../common/decorators";

type User = any;

/**
 * Alias controller for legacy frontend routes.
 * Provides /auth/me endpoint without /api prefix for compatibility.
 * Reuses existing auth logic and guards.
 */
@ApiTags("auth")
@Controller() // No prefix - routes will be at root level
export class AuthAliasController {
  /**
   * Get the current authenticated user (from Supabase JWT).
   * Alias for /api/auth/me - same logic, same guards, same response.
   */
  @Get("auth/me")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user (legacy alias)" })
  @ApiResponse({ status: 200, description: "Current user information" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMe(@CurrentUser() user: User) {
    // Reuse exact same logic as AuthController.getMe()
    // user is already the Prisma user injected by SupabaseAuthGuard
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }
}

