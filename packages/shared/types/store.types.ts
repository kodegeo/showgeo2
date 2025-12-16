export enum StoreStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  ARCHIVED = "ARCHIVED",
}

export enum StoreVisibility {
  PUBLIC = "PUBLIC",
  UNLISTED = "UNLISTED",
  PRIVATE = "PRIVATE",
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  isDigital: boolean;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Store {
  id: string;
  entityId: string;
  eventId?: string;
  tourId?: string;
  name: string;
  slug: string;
  description?: string;
  bannerImage?: string;
  logoUrl?: string;
  currency: string;
  status: StoreStatus;
  visibility: StoreVisibility;
  collaborators: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

