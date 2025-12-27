import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services";
import type { RegisterRequest, LoginRequest } from "@/services";
import type { User, UserProfile } from "../../../packages/shared/types/user.types";
import type { Entity } from "../../../packages/shared/types/entity.types";
import { handleApiError } from "@/services";
import { supabase } from "@/lib/supabase";

interface AuthState {
  user: (User & { profile?: UserProfile }) | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [entityRoles, setEntityRoles] = useState<any[] | null>(null);
  const [ownedEntity, setOwnedEntity] = useState<any | null>(null);

  const queryClient = useQueryClient();

  // ------------------------------------------------------------
  // 1️⃣ PRISMA "me" QUERY (core user, includes isEntity)
  // Only call /auth/me when we have a valid session with access_token
  // ------------------------------------------------------------
  // Track consecutive failures to prevent infinite retries
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const MAX_FAILURES = 3;

  const {
    data: prismaUser,
    isLoading: isLoadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: () => authService.getCurrentUser(),
    enabled: !!sessionToken && consecutiveFailures < MAX_FAILURES, // Disable after too many failures
    retry: false, // Prevent retries on any error (401, 500, etc.)
    retryOnMount: false, // Don't retry when component remounts
    refetchOnWindowFocus: false, // Don't refetch on window focus
    refetchOnReconnect: false, // Don't refetch on reconnect
    onError: (error: any) => {
      // Track failures - if we get too many, disable the query
      if (error?.response?.status === 500 || error?.response?.status === 401) {
        setConsecutiveFailures((prev) => prev + 1);
      }
    },
    onSuccess: () => {
      // Reset failure count on success
      setConsecutiveFailures(0);
    },
  });

  // ------------------------------------------------------------
  // 2️⃣ LOAD ENTITY ROLES AFTER prismaUser IS LOADED
  //     (authorization / permissions — NOT identity)
  // NOTE: This was removed useAuth should answer “who are you?”, not “what are you authorized to do?”
  // ------------------------------------------------------------

  // ------------------------------------------------------------
  // 3️⃣ LISTEN FOR SESSION CHANGES & SYNC USER STATE
  // Only set sessionToken when we have a valid access_token
  // ------------------------------------------------------------
  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const hasValidSession = !!data.session?.access_token;

      setHasSession(!!data.session);
      setSessionToken(data.session?.access_token || null);
      setAuthState((prev) => ({
        ...prev,
        isLoading: false,
        isAuthenticated: hasValidSession,
      }));
    };

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const hasValidSession = !!session?.access_token;
      setHasSession(!!session);
      setSessionToken(session?.access_token || null);

      if (!hasValidSession) {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
        queryClient.setQueryData(["auth", "me"], null);
        setEntityRoles(null);
        setOwnedEntity(null);
        setConsecutiveFailures(0); // Reset failure count when session is cleared
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  // ------------------------------------------------------------
  // 4️⃣ SYNC prismaUser → authState
  //     (identity now includes isEntity)
  // ------------------------------------------------------------
  useEffect(() => {
    if (prismaUser) {
      setAuthState({
        user: prismaUser,
        isLoading: false,
        isAuthenticated: true,
      });
    }
  }, [prismaUser]);

  // ------------------------------------------------------------
  // 5️⃣ REGISTER
  // ------------------------------------------------------------
  const registerMutation = useMutation({
    mutationFn: async ({ email, password, firstName, lastName }: RegisterRequest) => {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;

      if (data.user) {
        await authService.registerAppUser({
          authUserId: data.user.id,
          email,
          firstName,
          lastName,
        });
      }

      return data.user;
    },
    onSuccess: async () => {
      const { data } = await supabase.auth.getSession();
      const hasValidSession = !!data.session?.access_token;
      setHasSession(!!data.session);
      setSessionToken(data.session?.access_token || null);
      // Only refetch if we have a valid access_token
      if (hasValidSession) {
        await refetchUser();
      }
    },
  });

  // ------------------------------------------------------------
  // 6️⃣ LOGIN
  // ------------------------------------------------------------
  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: LoginRequest) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      const { data } = await supabase.auth.getSession();
      const hasValidSession = !!data.session?.access_token;
      setHasSession(!!data.session);
      setSessionToken(data.session?.access_token || null);
      // Only refetch if we have a valid access_token
      if (hasValidSession) {
        await refetchUser();
      }
    },
    onError: (error) => {
      console.error("[useAuth.login] ❌", error);
      // Clear session token on error to prevent retries
      setSessionToken(null);
      setConsecutiveFailures(0); // Reset failure count on login error
    },
  });

  // ------------------------------------------------------------
  // 7️⃣ LOGOUT
  // ------------------------------------------------------------
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionToken(null); // Clear session token to disable /auth/me query
    setHasSession(false);
    setAuthState({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    });
    queryClient.clear();
    setEntityRoles(null);
    setOwnedEntity(null);
  }, [queryClient]);

  // ------------------------------------------------------------
  // 8️⃣ PROFILE COMPLETENESS CHECK (USER ONLY)
  // ------------------------------------------------------------
  const profile = authState.user?.profile;


  // ------------------------------------------------------------
  // 9️⃣ DERIVED IDENTITY FLAGS (additive)
  // ------------------------------------------------------------
  const isEntityUser = !!authState.user?.isEntity;

  // ------------------------------------------------------------
  // 🔟 FINAL RETURN (no removals)
  // ------------------------------------------------------------
  return {
    user: authState.user,
    isLoading: authState.isLoading || isLoadingUser,
    isAuthenticated: authState.isAuthenticated,

    // identity / setup
    isEntityUser,

    // entity data (unchanged)
    entityRoles,
    ownedEntity,

    // auth actions (unchanged)
    login: loginMutation.mutate,
    loginAsync: loginMutation.mutateAsync,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error ? handleApiError(loginMutation.error) : null,

    register: registerMutation.mutate,
    registerAsync: registerMutation.mutateAsync,
    registerLoading: registerMutation.isPending,
    registerError: registerMutation.error ? handleApiError(registerMutation.error) : null,

    logout,
    refetchUser,
  };
}
