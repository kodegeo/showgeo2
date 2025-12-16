import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { SupabaseAuthGuard } from "../../common/guards/supabase-auth.guard";
import { DevOnlyGuard } from "../../common/guards/dev-only.guard";
import { CurrentUser, Public, DevOnly } from "../../common/decorators";
import { UserRole } from "@prisma/client";

type User = any;

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Create app_users record after Supabase Auth registration.
   * Called by frontend AFTER supabase.auth.signUp() succeeds.
   */
  @Post("register-app-user")
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: "Create app_users record after Supabase Auth registration",
  })
  @ApiResponse({ status: 201, description: "App user created successfully" })
  @ApiResponse({
    status: 409,
    description: "App user already exists for this auth user",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  async registerAppUser(
    @Body()
    body: {
      authUserId: string;
      email: string;
      firstName?: string;
      lastName?: string;
    }
  ) {
    return this.authService.createAppUserFromSupabaseAuth(body);
  }

  /**
   * Get the current authenticated user (from Supabase JWT).
   */
  @Get("me")
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current authenticated user" })
  @ApiResponse({ status: 200, description: "Current user information" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getMe(@CurrentUser() user: User) {
    // user is already the Prisma user injected by SupabaseAuthGuard
    const { password, ...userWithoutPassword } = user as any;
    return userWithoutPassword;
  }

  /**
   * DEV-ONLY: Create a Supabase auth user and corresponding app_users record.
   * This endpoint is only available in development mode.
   * Uses Supabase Admin API to create users.
   */
  @Post("dev/create-user")
  @UseGuards(DevOnlyGuard)
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @DevOnly()
  @ApiOperation({
    summary: "[DEV ONLY] Create Supabase auth user and app_users record",
    description:
      "Creates both a Supabase auth user and corresponding app_users record. Only available in development mode.",
  })
  @ApiResponse({
    status: 201,
    description: "User created successfully (dev only)",
  })
  @ApiResponse({
    status: 400,
    description: "Bad request or failed to create user",
  })
  @ApiResponse({
    status: 403,
    description: "This endpoint is only available in development mode",
  })
  @ApiResponse({
    status: 409,
    description: "User with this email already exists",
  })
  async createDevUser(
    @Body()
    body: {
      email: string;
      password: string;
      firstName?: string;
      lastName?: string;
      role?: UserRole;
    },
  ) {
    return this.authService.createDevUser(body);
  }
}
