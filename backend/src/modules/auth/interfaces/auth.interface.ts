import { UserRole } from "@prisma/client";

export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role: UserRole;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface RequestWithUser extends Request {
  user: {
    id: string;
    email: string;
    role: UserRole;
    profile?: {
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    };
  };
}

