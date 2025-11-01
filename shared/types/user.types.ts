export enum UserRole {
  USER = "USER",
  ENTITY = "ENTITY",
  MANAGER = "MANAGER",
  COORDINATOR = "COORDINATOR",
  ADMIN = "ADMIN",
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  preferences?: Record<string, unknown>;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
}

