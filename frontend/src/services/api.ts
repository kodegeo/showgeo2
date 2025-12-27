import axios, { Axios, AxiosError, AxiosResponse } from "axios";
import type { ApiError } from "./types";
import { supabase } from "@/lib/supabase";
import { isDevelopment } from "@/utils/env";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: isDevelopment ? 10000 : 15000, // Longer timeout in dev to account for slower backend
});

// Request interceptor for auth tokens
apiClient.interceptors.request.use(
  async (config) => {
    // Get Supabase session token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    
    // Don't override Content-Type for FormData uploads
    if (config.data instanceof FormData) {
      // Remove Content-Type to let browser set it with boundary
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError<ApiError>) => {
    // Handle network errors (backend down, timeout, etc.)
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      if (isDevelopment) {
        console.warn('[apiClient] Backend appears to be unavailable:', {
          code: error.code,
          message: error.message,
          url: error.config?.url,
        });
      }
      // Don't redirect on network errors, just reject with helpful message
      return Promise.reject(
        new Error(isDevelopment 
          ? 'Backend unavailable. Is the server running on http://localhost:3000?'
          : 'Service temporarily unavailable'
        )
      );
    }

    // Handle 401 errors - sign out from Supabase
    // Only redirect if we're not already on the login page to prevent loops
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Don't redirect if already on login/register pages to prevent loops
      if (!currentPath.includes("/login") && !currentPath.includes("/register")) {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }
      return Promise.reject(error);
    }

    // Handle 500 errors - don't retry, just reject with helpful message
    if (error.response?.status === 500) {
      if (isDevelopment) {
        console.error('[apiClient] Server error (500):', {
          url: error.config?.url,
          message: error.message,
          data: error.response?.data,
        });
      }
      // Reject immediately without retry
      return Promise.reject(
        new Error(isDevelopment
          ? `Server error: ${error.config?.url}. Check backend logs.`
          : 'Server error. Please try again later.'
        )
      );
    }

    // Handle other errors
    return Promise.reject(error);
  },
);

// Helper function to handle API errors
export function handleApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const apiError = error.response?.data as ApiError;

    if (apiError?.message) {
      if (Array.isArray(apiError.message)) {
        return apiError.message.join(", ");
      }
      return apiError.message;
    }

    if (apiError?.errors) {
      return apiError.errors
        .map((e) => Object.values(e.constraints).join(", "))
        .join(", ");
    }

    return error.message || "An error occurred";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected error occurred";
}


