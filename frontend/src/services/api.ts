import axios, { Axios, AxiosError, AxiosResponse } from "axios";
import type { ApiError } from "./types";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiClient = axios.create({
  baseURL: "/api",
  withCredentials: true,
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


