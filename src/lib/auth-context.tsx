"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, getToken, setToken } from "./api";
import type { PatientSignupRequest, TokenResponse, UserRole } from "./types";

interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: PatientSignupRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_KEY = "medidispense_user";

/**
 * Where each role lands right after signing in (or after ProtectedPage sends
 * someone away from a page their role can't see). Pharmacist and nurse have
 * no dedicated pages built yet in this pass, so they land on /dashboard.
 */
export const ROLE_HOME: Record<UserRole, string> = {
  admin: "/dashboard",
  doctor: "/doctor",
  technician: "/technician",
  nurse: "/dashboard",
  pharmacist: "/dashboard",
  patient: "/patient",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(USER_KEY) : null;
    if (token && stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {
        setUser(null);
      }
    }
    setLoading(false);
  }, []);

  const applySession = useCallback(
    (data: TokenResponse) => {
      setToken(data.access_token);
      const authUser: AuthUser = { id: data.user_id, name: data.name, role: data.role };
      window.localStorage.setItem(USER_KEY, JSON.stringify(authUser));
      setUser(authUser);
      router.push(ROLE_HOME[data.role] ?? "/dashboard");
    },
    [router],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await api.post<TokenResponse>("/auth/login", { email, password });
      applySession(res.data);
    },
    [applySession],
  );

  const signup = useCallback(
    async (payload: PatientSignupRequest) => {
      const res = await api.post<TokenResponse>("/auth/signup/patient", payload);
      applySession(res.data);
    },
    [applySession],
  );

  const logout = useCallback(() => {
    setToken(null);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
    router.push("/login");
  }, [router]);

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
