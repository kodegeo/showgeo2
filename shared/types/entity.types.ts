export enum EntityType {
  INDIVIDUAL = "INDIVIDUAL",
  ORGANIZATION = "ORGANIZATION",
}

export enum EntityRoleType {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  COORDINATOR = "COORDINATOR",
}

export interface Entity {
  id: string;
  ownerId: string;
  type: EntityType;
  name: string;
  slug: string;
  bio?: string;
  tags: string[];
  thumbnail?: string;
  bannerImage?: string;
  location?: string;
  website?: string;
  socialLinks?: Record<string, string>;
  isVerified: boolean;
  isPublic: boolean;
  defaultCoordinatorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EntityRole {
  id: string;
  userId: string;
  entityId: string;
  role: EntityRoleType;
  createdAt: string;
  updatedAt: string;
}

