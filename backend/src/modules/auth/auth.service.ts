import {
  Injectable,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { Prisma } from "@prisma/client";
// Prisma generates types based on model names - app_users model generates app_users types
// Use any for now until Prisma types are fully regenerated
type User = any;
import { UserRole } from "@prisma/client";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { RegisterDto, LoginDto, RefreshTokenDto } from "./dto";

@Injectable()
export class AuthService {
  private supabase: SupabaseClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>("SUPABASE_URL");
    const serviceRoleKey =
      this.configService.get<string>("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      // Hard fail on misconfig — this is a backend-only secret
      throw new Error(
        "Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set",
      );
    }

    this.supabase = createClient(supabaseUrl, serviceRoleKey);
  }

  /**
   * Verify a Supabase access token and ensure there is a corresponding app user.
   * - If the token is valid and a user exists → returns full user (with profile & entity roles)
   * - If the token is valid but no app user exists → creates one, then returns it
   * - If the token is invalid → returns null
   */
  async verifySupabaseToken(token: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data?.user) {
      return null;
    }

    const authUser = data.user;

    // Try to find existing app user tied to this Supabase auth user
    let dbUser = await (this.prisma as any).app_users.findUnique({
      where: { authUserId: authUser.id },
      include: {
        user_profiles: true,
        entity_roles: {
          include: {
            entities: true,
          },
        },
      },
    });

    // If none exists, create one on the fly (auto-provisioning)
    if (!dbUser) {
      dbUser = await (this.prisma as any).app_users.create({
        data: {
          id: authUser.id, // Use authUserId as primary key
          authUserId: authUser.id,
          email: authUser.email ?? "",
          role: UserRole.USER,
          password: null, // No password stored for Supabase-auth users
          isEntity: false,
        },
        include: {
          user_profiles: true,
          entity_roles: {
            include: {
              entities: true,
            },
          },
        },
      });
    }

    return dbUser;
  }

  /**
   * Used by controllers to fetch a user by internal app user id.
   * Includes profile and entity roles.
   */
  async validateUser(userId: string): Promise<User | null> {
    const user = await (this.prisma as any).app_users.findUnique({
      where: { id: userId },
      include: {
        user_profiles: true,
        entity_roles: {
          include: {
            entities: true,
          },
        },
      },
    });

    return user;
  }

  /**
   * Create app_users record after Supabase Auth registration.
   * This is called by the frontend AFTER Supabase signUp succeeds.
   * 
   * IDEMPOTENT: If user already exists, returns existing user without error.
   */
  async createAppUserFromSupabaseAuth(data: {
    authUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { authUserId, email, firstName, lastName } = data;
  
    if (!authUserId || !email) {
      throw new BadRequestException("authUserId and email are required");
    }
  
    // 1️⃣ Check existing user by authUserId (idempotent check)
    const existingUser = await (this.prisma as any).app_users.findUnique({
      where: { authUserId },
      include: {
        user_profiles: true,
        entity_roles: {
          include: {
            entities: true,
          },
        },
      },
    });
  
    // If user exists, return it (idempotent behavior)
    if (existingUser) {
      const { password: _, ...userWithoutPassword } = existingUser;
      return userWithoutPassword;
    }
  
    // 2️⃣ Defensive email check (prevent duplicate emails)
    const existingEmail = await (this.prisma as any).app_users.findUnique({
      where: { email },
    });
  
    if (existingEmail) {
      throw new ConflictException("User with this email already exists");
    }
  
    // 3️⃣ Create app user with id = authUserId (primary key alignment)
    const user = await (this.prisma as any).app_users.create({
      data: {
        id: authUserId, // Use authUserId as primary key
        authUserId,
        email,
        role: UserRole.USER,
        isEntity: false,
        password: null, // No password stored for Supabase-auth users
      },
    });
  
    // 4️⃣ Create profile ONLY if names provided
    if (firstName || lastName) {
      await (this.prisma as any).user_profiles.create({
        data: {
          id: crypto.randomUUID(), // user_profiles.id is required (no default)
          userId: user.id, // user_profiles.userId references app_users.id
          firstName,
          lastName,
        },
      });
    }
  
    // 5️⃣ Fetch and return complete user with relations
    const completeUser = await (this.prisma as any).app_users.findUnique({
      where: { id: user.id },
      include: {
        user_profiles: true,
        entity_roles: {
          include: {
            entities: true,
          },
        },
      },
    });
  
    const { password: _, ...userWithoutPassword } = completeUser;
    return userWithoutPassword;
  }
  
  // ───────────────────────────────────────────────────────────────
  // 🧩 Legacy JWT/password methods — kept only so AuthController compiles.
  //    These are NOT used in the new Supabase-based flow.
  //    If any client hits these endpoints, they get a clear error.
  // ───────────────────────────────────────────────────────────────

  async register(_registerDto: RegisterDto): Promise<never> {
    throw new BadRequestException(
      "Email/password registration is now handled by Supabase Auth. Call Supabase from the frontend, then /auth/register-app-user.",
    );
  }

  async login(_loginDto: LoginDto): Promise<never> {
    throw new BadRequestException(
      "Password-based login is now handled by Supabase Auth. Use Supabase signInWithPassword from the frontend.",
    );
  }

  async refreshToken(_refreshTokenDto: RefreshTokenDto): Promise<never> {
    throw new BadRequestException(
      "Token refresh is managed by Supabase. Do not call /auth/refresh on the backend.",
    );
  }

  /**
   * DEV-ONLY: Create a Supabase auth user and corresponding app_users record.
   * This uses the Supabase Admin API (service role key) to create users.
   * Only available in development mode.
   */
  async createDevUser(data: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    role?: UserRole;
  }): Promise<Partial<User>> {
    const { email, password, firstName, lastName, role = UserRole.USER } = data;

    // Check if user already exists
    const existingUser = await (this.prisma as any).app_users.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Create Supabase auth user using Admin API
    const { data: authData, error: authError } =
      await this.supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm email in dev
      });

    if (authError || !authData.user) {
      throw new BadRequestException(
        `Failed to create Supabase auth user: ${authError?.message || "Unknown error"}`,
      );
    }

    const authUserId = authData.user.id;

    // Create app_users record with id = authUserId
    const user = await (this.prisma as any).app_users.create({
      data: {
        id: authUserId, // Use authUserId as primary key
        email,
        authUserId,
        role,
        password: null, // No password stored for Supabase-auth users
        isEntity: false,
      },
    });

    // Create profile if names provided
    if (firstName || lastName) {
      await (this.prisma as any).user_profiles.create({
        data: {
          id: crypto.randomUUID(),
          userId: user.id,
          firstName,
          lastName,
        },
      });
    }

    // Fetch complete user with relations
    const completeUser = await (this.prisma as any).app_users.findUnique({
      where: { id: user.id },
      include: {
        user_profiles: true,
        entity_roles: {
          include: {
            entities: true,
          },
        },
      },
    });

    const { password: _, ...userWithoutPassword } = completeUser;
    return userWithoutPassword;
  }
}
