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
  isEntity: boolean;
  createdAt: string;
  updatedAt: string;
  authUserId?: string;
  profile?: UserProfile;
}


export interface UserProfile {
  id: string;
  userId: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  bio?: string;
  location?: string;
  timezone?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  preferences?: Record<string, unknown>;
  visibility: "public" | "private";
  createdAt: string;
  updatedAt: string;
  entities?: Entity[];
}

export interface Entity {
  id: string;
  name: string;
  slug: string;
  type?: string;
  bio?: string;
  tags?: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isPublic?: boolean;
  isVerified?: boolean;  // <--- ADD THIS
}

export interface EntityRole {
  id: string;
  userId: string;
  entityId: string;
  role: string;
  entity?: Entity;
}

export enum UserStatus {
  ACTIVE = "ACTIVE",
  SUSPENDED = "SUSPENDED",
  INVITED = "INVITED",
  PENDING = "PENDING",
  REJECTED = "REJECTED",
  VERIFIED = "VERIFIED",
  UNVERIFIED = "UNVERIFIED",
  DELETED = "DELETED",
  ARCHIVED = "ARCHIVED",
  PENDING_VERIFICATION = "PENDING_VERIFICATION",
  PENDING_APPROVAL = "PENDING_APPROVAL",
  PENDING_REJECTION = "PENDING_REJECTION",
}


