// API Response Types

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}


export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    profile?: {
      id: string;
      username?: string;
      firstName?: string;
      lastName?: string;
    };
  };
}

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
  errors?: Array<{
    property: string;
    constraints: Record<string, string>;
  }>;
}

// Request Types

export interface RegisterRequest {
  email: string;
  password: string;
  role?: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  [key: string]: unknown;
}

export interface EventWithEntity extends Event {
  entities_events_entityIdToentities?: {
    id: string;
    name: string;
  } | null;
}



