import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcrypt";
import { PrismaService } from "../../prisma/prisma.service";
import { RegisterDto, LoginDto, RefreshTokenDto } from "./dto";
import { User, UserRole } from "@prisma/client";
import { JwtPayload, TokenResponse } from "./interfaces/auth.interface";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<TokenResponse & { user: Partial<User> }> {
    const { email, password, role, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("User with this email already exists");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: role || UserRole.USER,
        profile: {
          create: {
            firstName,
            lastName,
          },
        },
      },
      include: {
        profile: true,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    // Store refresh token (optional - can use database or cache)
    // For now, we'll just return it and the client stores it

    const { password: _, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async login(loginDto: LoginDto): Promise<TokenResponse & { user: Partial<User> }> {
    const { email, password } = loginDto;

    // Find user with profile
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        profile: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Check password (handle OAuth users who might not have a password)
    if (!user.password) {
      throw new UnauthorizedException("Invalid credentials. Please use OAuth to sign in.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role);

    const { password: _, ...userWithoutPassword } = user;

    return {
      ...tokens,
      user: userWithoutPassword,
    };
  }

  async refreshToken(refreshTokenDto: RefreshTokenDto): Promise<TokenResponse> {
    const { refreshToken } = refreshTokenDto;

    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>("REFRESH_TOKEN_SECRET") || "refresh-secret",
      });

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException("User not found");
      }

      // Generate new tokens
      return this.generateTokens(user.id, user.email, user.role);
    } catch (error) {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async validateUser(userId: string): Promise<User | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        entityRoles: {
          include: {
            entity: true,
          },
        },
      },
    });

    return user;
  }

  private async generateTokens(userId: string, email: string, role: UserRole): Promise<TokenResponse> {
    const payload: JwtPayload = {
      sub: userId,
      email,
      role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("JWT_SECRET") || "jwt-secret",
        expiresIn: this.configService.get<string>("JWT_EXPIRATION") || "15m",
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>("REFRESH_TOKEN_SECRET") || "refresh-secret",
        expiresIn: this.configService.get<string>("REFRESH_TOKEN_EXPIRATION") || "7d",
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async validatePayload(payload: JwtPayload): Promise<User | null> {
    return this.validateUser(payload.sub);
  }
}

