import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
  InternalServerErrorException,
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
import { randomUUID } from "crypto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
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
   * - If the token is valid but Prisma operations fail → returns minimal user object
   * - If the token is invalid → returns null
   */
  async verifySupabaseToken(token: string): Promise<User | null> {
    const { data, error } = await this.supabase.auth.getUser(token);

    if (error || !data?.user) {
      return null;
    }

    const authUser = data.user;

    // Check account_status from JWT app_metadata first (immediate enforcement)
    // This ensures suspended/disabled users are blocked even with cached tokens
    const jwtAccountStatus = (authUser.app_metadata as any)?.account_status;
    if (jwtAccountStatus && jwtAccountStatus !== "ACTIVE") {
      const statusMessage =
        jwtAccountStatus === "SUSPENDED"
          ? "Your account has been suspended. Please contact support for assistance."
          : jwtAccountStatus === "DISABLED"
          ? "Your account has been disabled. Please contact support for assistance."
          : "Your account is not active. Please contact support for assistance.";
      throw new ForbiddenException(statusMessage);
    }

    try {
      // Try to find existing app user tied to this Supabase auth user
      let dbUser = await (this.prisma as any).app_users.findUnique({
        where: { authUserId: authUser.id },
        include: {
          user_profiles: true,
          entity_roles: {
            include: {
              entities: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  type: true,
                  thumbnail: true,
                  isVerified: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });

      // If none exists, create one on the fly (auto-provisioning)
      if (!dbUser) {
        try {
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
                  entities: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                      type: true,
                      thumbnail: true,
                      isVerified: true,
                      createdAt: true,
                    },
                  },
                },
              },
            },
          });
        } catch (createError) {
          // If creation fails, return minimal user object based on Supabase auth data
          console.warn(
            `[AuthService] Failed to create app user for authUserId ${authUser.id}:`,
            createError,
          );
          return {
            id: authUser.id,
            authUserId: authUser.id,
            email: authUser.email ?? "",
            role: UserRole.USER,
            isEntity: false,
            user_profiles: null,
            entity_roles: [],
          };
        }
      }

      // Check account_status from database (single source of truth)
      // Only ACTIVE users can access protected endpoints
      if (dbUser.account_status !== "ACTIVE") {
        const statusMessage =
          dbUser.account_status === "SUSPENDED"
            ? "Your account has been suspended. Please contact support for assistance."
            : dbUser.account_status === "DISABLED"
            ? "Your account has been disabled. Please contact support for assistance."
            : "Your account is not active. Please contact support for assistance.";
        throw new ForbiddenException(statusMessage);
      }

      return dbUser;
    } catch (prismaError) {
      // Re-throw ForbiddenException for disabled users
      if (prismaError instanceof ForbiddenException) {
        throw prismaError;
      }
      // If Prisma query fails, return minimal user object based on Supabase auth data
      console.warn(
        `[AuthService] Prisma error while fetching user for authUserId ${authUser.id}:`,
        prismaError,
      );
      return {
        id: authUser.id,
        authUserId: authUser.id,
        email: authUser.email ?? "",
        role: UserRole.USER,
        isEntity: false,
        user_profiles: null,
        entity_roles: [],
      };
    }
  }

  /**
   * Get Supabase user by ID (for debugging/metadata access)
   * Used by /auth/me to include Supabase app_metadata for consistency checking
   */
  async getSupabaseUserById(authUserId: string): Promise<any> {
    try {
      const { data, error } = await this.supabase.auth.admin.getUserById(authUserId);
      if (error || !data?.user) {
        return null;
      }
      return data.user;
    } catch (error) {
      return null;
    }
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
   * 
   * Error Handling:
   * - P2002 (Unique constraint violation) → ConflictException (409)
   * - P2003 (Foreign key constraint violation) → BadRequestException (400)
   * - Other Prisma errors → InternalServerErrorException (500) with logging
   */
  async createAppUserFromSupabaseAuth(data: {
    authUserId: string;
    email: string;
    firstName?: string;
    lastName?: string;
  }) {
    const { authUserId, email, firstName, lastName } = data;
  
    this.logger.log(`[REGISTER_APP_USER] Starting registration for authUserId: ${authUserId}, email: ${email}`);
    this.logger.debug(`[REGISTER_APP_USER] DTO: ${JSON.stringify({ authUserId, email, hasFirstName: !!firstName, hasLastName: !!lastName })}`);
  
    // VALIDATION: Required fields
    if (!authUserId || !email) {
      this.logger.warn(`[REGISTER_APP_USER] Missing required fields: authUserId=${!!authUserId}, email=${!!email}`);
      throw new BadRequestException("authUserId and email are required");
    }
  
    // VALIDATION: Email format (basic)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      this.logger.warn(`[REGISTER_APP_USER] Invalid email format: ${email}`);
      throw new BadRequestException("Invalid email format");
    }
  
    // VALIDATION: UUID format for authUserId (since schema has @db.Uuid)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(authUserId)) {
      this.logger.warn(`[REGISTER_APP_USER] Invalid UUID format for authUserId: ${authUserId}`);
      throw new BadRequestException(`authUserId must be a valid UUID format. Received: ${authUserId}`);
    }
  
    try {
      // 1️⃣ Check existing user by authUserId (idempotent check)
      this.logger.debug(`[REGISTER_APP_USER] Checking for existing user by authUserId: ${authUserId}`);
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
        this.logger.log(`[REGISTER_APP_USER] User already exists (idempotent): ${authUserId}`);
        const { password: _, ...userWithoutPassword } = existingUser;
        return userWithoutPassword;
      }
    
      // 2️⃣ Defensive email check (prevent duplicate emails)
      this.logger.debug(`[REGISTER_APP_USER] Checking for existing user by email: ${email}`);
      const existingEmail = await (this.prisma as any).app_users.findUnique({
        where: { email },
      });
    
      if (existingEmail) {
        this.logger.warn(`[REGISTER_APP_USER] Email already exists: ${email}`);
        throw new ConflictException("User with this email already exists");
      }
    
      // 3️⃣ Atomic transaction: Create app user + profile (if names provided)
      this.logger.debug(`[REGISTER_APP_USER] Creating user in transaction: authUserId=${authUserId}, email=${email}`);
      
      const user = await (this.prisma as any).$transaction(async (tx: any) => {
        // Create app user
        this.logger.debug(`[REGISTER_APP_USER] Creating app_users record: id=${authUserId}, authUserId=${authUserId}, email=${email}`);
        const newUser = await tx.app_users.create({
          data: {
            id: authUserId, // Use authUserId as primary key
            authUserId,
            email,
            role: UserRole.USER,
            password: null, // No password stored for Supabase-auth users
            // Note: isEntity is not in schema - removed to prevent errors
          },
        });
        
        this.logger.debug(`[REGISTER_APP_USER] Created app_users record: ${newUser.id}`);
        
        // Create profile ONLY if names provided (within same transaction)
        if (firstName || lastName) {
          const profileId = randomUUID();
          this.logger.debug(`[REGISTER_APP_USER] Creating user_profiles record: id=${profileId}, userId=${newUser.id}`);
          await tx.user_profiles.create({
            data: {
              id: profileId, // user_profiles.id is required (no default)
              userId: newUser.id, // user_profiles.userId references app_users.id
              firstName: firstName || null,
              lastName: lastName || null,
            },
          });
          this.logger.debug(`[REGISTER_APP_USER] Created user_profiles record: ${profileId}`);
        }
        
        return newUser;
      });
    
      this.logger.log(`[REGISTER_APP_USER] Successfully created user: ${user.id}`);
    
      // 4️⃣ Fetch and return complete user with relations
      this.logger.debug(`[REGISTER_APP_USER] Fetching complete user with relations: ${user.id}`);
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
    
      if (!completeUser) {
        this.logger.error(`[REGISTER_APP_USER] User created but not found on fetch: ${user.id}`);
        throw new InternalServerErrorException("User created but could not be retrieved");
      }
    
      const { password: _, ...userWithoutPassword } = completeUser;
      this.logger.log(`[REGISTER_APP_USER] Registration complete: ${user.id}`);
      return userWithoutPassword;
      
    } catch (error) {
      // Handle Prisma known errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(`[REGISTER_APP_USER] Prisma error (code: ${error.code}): ${error.message}`);
        
        // P2002: Unique constraint violation
        if (error.code === "P2002") {
          const target = (error.meta as any)?.target;
          if (Array.isArray(target) && target.includes("email")) {
            this.logger.warn(`[REGISTER_APP_USER] Email conflict: ${email}`);
            throw new ConflictException("User with this email already exists");
          }
          if (Array.isArray(target) && target.includes("authUserId")) {
            this.logger.warn(`[REGISTER_APP_USER] authUserId conflict: ${authUserId}`);
            throw new ConflictException("User with this authUserId already exists");
          }
          if (Array.isArray(target) && target.includes("users_pkey")) {
            this.logger.warn(`[REGISTER_APP_USER] Primary key conflict: ${authUserId}`);
            throw new ConflictException("User with this ID already exists");
          }
          // Generic unique constraint
          this.logger.warn(`[REGISTER_APP_USER] Unique constraint violation: ${JSON.stringify(target)}`);
          throw new ConflictException("A user with this information already exists");
        }
        
        // P2003: Foreign key constraint violation
        if (error.code === "P2003") {
          const field = (error.meta as any)?.field_name;
          this.logger.error(`[REGISTER_APP_USER] Foreign key violation: ${field}`);
          throw new BadRequestException(`Invalid reference: ${field || "foreign key constraint violated"}`);
        }
        
        // P2025: Record not found (shouldn't happen on create, but handle it)
        if (error.code === "P2025") {
          this.logger.error(`[REGISTER_APP_USER] Record not found: ${error.message}`);
          throw new BadRequestException("Referenced record not found");
        }
        
        // Other Prisma errors
        this.logger.error(`[REGISTER_APP_USER] Unhandled Prisma error: ${error.code} - ${error.message}`);
        throw new InternalServerErrorException(
          `Database error during user registration: ${error.message}`
        );
      }
      
      // Handle NestJS HTTP exceptions (re-throw as-is)
      if (error instanceof ConflictException || 
          error instanceof BadRequestException ||
          error instanceof InternalServerErrorException) {
        throw error;
      }
      
      // Handle unknown errors
      this.logger.error(
        `[REGISTER_APP_USER] Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined
      );
      throw new InternalServerErrorException(
        `Unexpected error during user registration: ${error instanceof Error ? error.message : String(error)}`
      );
    }
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
