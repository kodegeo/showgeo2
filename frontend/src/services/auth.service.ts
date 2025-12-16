import { supabase } from "@/lib/supabase";
import { apiClient } from "./api";
import type { User, UserProfile } from "../../../packages/shared/types/user.types";

/* ------------------------------------------------------------------
 * Request / Payload Types
 * ------------------------------------------------------------------ */

export interface RegisterRequest {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterAppUserRequest {
  authUserId: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

/* ------------------------------------------------------------------
 * Auth Service
 * ------------------------------------------------------------------ */

export const authService = {
  /**
   * Register a new Supabase Auth user
   * Then create app_users record in backend
   *
   * NOTE:
   * - isEntity is NOT set here
   * - identity escalation happens later (entity creation / approval)
   */
  async register(data: RegisterRequest) {
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    });

    if (error) throw new Error(error.message);
    if (!authData.user) throw new Error("No user returned from Supabase");

    await apiClient.post("/auth/register-app-user", {
      authUserId: authData.user.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
    });

    // session may be null if email confirmation is required
    return authData.user;
  },

  /**
   * Login using Supabase Auth only
   *
   * Identity (isEntity) is resolved by backend via /auth/me
   */
  async login(email: string, password: string) {
    console.log("[authService.login] ▶ Supabase signInWithPassword", { email });

    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const errAny = error as any;
      console.error("[authService.login] 💥 Supabase error", {
        name: error.name,
        message: error.message,
        status: errAny?.status,
        code: errAny?.code,
        __raw: error,
      });
      throw error;
    }

    console.log("[authService.login] ✅ Success", {
      user: authData?.user?.id,
      hasSession: !!authData?.session,
    });

    return authData; // contains user + session
  },

  /**
   * Get current application user from backend
   *
   * IMPORTANT:
   * - Backend must return isEntity
   * - Backend must attach profile if it exists
   *
   * This is the canonical identity endpoint.
   */
  async getCurrentUser(): Promise<User & { profile?: UserProfile }> {
    const res = await apiClient.get("/auth/me");
    return res.data;
  },

  /**
   * Create app_users record (called after Supabase signup)
   *
   * NOTE:
   * - isEntity defaults to false in DB
   * - no identity inference here
   */
  async registerAppUser(payload: RegisterAppUserRequest) {
    const res = await apiClient.post("/auth/register-app-user", payload);
    return res.data;
  },

  /**
   * Logout (Supabase only)
   */
  async logout() {
    await supabase.auth.signOut();
  },

  /**
   * Supabase session check
   */
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  /**
   * Listen to Supabase auth state changes
   */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};
