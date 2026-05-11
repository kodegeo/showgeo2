import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { authService } from "@/services";
import type { RegisterRequest, LoginRequest } from "@/services";
import type { User, UserProfile } from "../../../packages/shared/types/user.types";
import { handleApiError } from "@/services";
import { supabase } from "@/lib/supabase";
import axios from "axios";

const MAX_ME_FAILURES = 3;

export type AuthContextValue = {
  user: (User & { profile?: UserProfile }) | null;
  /** True until first `getSession` completes, or while `/auth/me` is resolving for an active session */
  isLoading: boolean;
  /** Logged in with a valid Showgeo app user from `/auth/me` (not merely a Supabase session) */
  isAuthenticated: boolean;
  hasSession: boolean | null;
  isEntityUser: boolean;
  profile: UserProfile | undefined;
  entityRoles: unknown[] | null;
  ownedEntity: unknown | null;
  login: (vars: LoginRequest) => void;
  loginAsync: (vars: LoginRequest) => Promise<unknown>;
  loginLoading: boolean;
  loginError: string | null;
  register: (vars: RegisterRequest & { firstName?: string; lastName?: string }) => void;
  registerAsync: (vars: RegisterRequest & { firstName?: string; lastName?: string }) => Promise<unknown>;
  registerLoading: boolean;
  registerError: string | null;
  logout: () => Promise<void>;
  refetchUser: () => Promise<unknown>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessionResolved, setSessionResolved] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [entityRoles, setEntityRoles] = useState<unknown[] | null>(null);
  const [ownedEntity, setOwnedEntity] = useState<unknown | null>(null);

  const queryClient = useQueryClient();

  const meEnabled = !!sessionToken && consecutiveFailures < MAX_ME_FAILURES;

  const {
    data: user,
    isPending: isMePending,
    isFetching: isMeFetching,
    isError: isMeError,
    refetch: refetchUser,
  } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      try {
        return await authService.getCurrentUser();
      } catch (e) {
        const status = axios.isAxiosError(e) ? e.response?.status : undefined;
        if (status === 401) {
          queryClient.setQueryData(["auth", "me"], null);
          await supabase.auth.signOut();
          setSessionToken(null);
          setHasSession(false);
          setConsecutiveFailures(0);
          setEntityRoles(null);
          setOwnedEntity(null);
        } else if (status === 500) {
          setConsecutiveFailures((prev) => prev + 1);
        }
        throw e;
      }
    },
    enabled: meEnabled,
    retry: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  useEffect(() => {
    if (user) {
      setConsecutiveFailures(0);
    }
  }, [user]);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token ?? null;
      setHasSession(!!data.session);
      setSessionToken(token);
      setSessionResolved(true);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const token = session?.access_token ?? null;
      setHasSession(!!session);
      setSessionToken(token);

      if (!token) {
        queryClient.setQueryData(["auth", "me"], null);
        setEntityRoles(null);
        setOwnedEntity(null);
        setConsecutiveFailures(0);
      }
    });

    return () => subscription.unsubscribe();
  }, [queryClient]);

  const identityStillLoading =
    meEnabled &&
    !isMeError &&
    (isMePending || (isMeFetching && user === undefined));

  const isLoading = !sessionResolved || identityStillLoading;
  const isAuthenticated = Boolean(sessionToken && user && !isMeError);

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
      if (hasValidSession) {
        const result = await refetchUser();
        if (result.status === "error") {
          throw result.error;
        }
      }
    },
  });

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
      if (hasValidSession) {
        const result = await refetchUser();
        if (result.status === "error") {
          throw result.error;
        }
      }
    },
    onError: (error) => {
      console.error("[useAuth.login] ❌", error);
      setSessionToken(null);
      setConsecutiveFailures(0);
    },
  });

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setSessionToken(null);
    setHasSession(false);
    queryClient.clear();
    setEntityRoles(null);
    setOwnedEntity(null);
    setConsecutiveFailures(0);
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: user ?? null,
      isLoading,
      isAuthenticated,
      hasSession,
      isEntityUser: !!user?.isEntity,
      profile: user?.profile,
      entityRoles,
      ownedEntity,
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
    }),
    [
      user,
      isLoading,
      isAuthenticated,
      hasSession,
      entityRoles,
      ownedEntity,
      loginMutation.mutate,
      loginMutation.mutateAsync,
      loginMutation.isPending,
      loginMutation.error,
      registerMutation.mutate,
      registerMutation.mutateAsync,
      registerMutation.isPending,
      registerMutation.error,
      logout,
      refetchUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
