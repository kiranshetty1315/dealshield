"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User } from "@/types";
import { api } from "@/lib/api/client";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, fullName?: string, organization?: string) => Promise<User>;
  logout: () => Promise<void>;
  updateUser: (data: { full_name?: string; organization?: string; role?: string }) => Promise<User>;
  refreshUser: () => Promise<User | null>;
  setDemoUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "dealshield_auth_user";
const STORAGE_KEY_TOKEN = "dealshield_auth_token";

const DEFAULT_DEMO_USER: User = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "demo@dealshield.local",
  full_name: "Demo User",
  role: "Contract Sponsor",
  organization: "DealShield LegalTech Hackathon",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore authenticated session from localStorage on mount and refresh from Supabase
  useEffect(() => {
    async function restoreSession() {
      try {
        const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
        const storedUser = localStorage.getItem(STORAGE_KEY_USER);

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));

          // Background revalidation against Supabase database
          api.getMe(storedToken).then((freshUser) => {
            if (freshUser) {
              setUser(freshUser);
              localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
            }
          }).catch(() => null);
        }
      } catch (e) {
        console.warn("Failed to restore auth session:", e);
      } finally {
        setIsLoading(false);
      }
    }
    restoreSession();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true);
    try {
      const authRes = await api.login({ email, password });
      setUser(authRes.user);
      setToken(authRes.access_token);
      localStorage.setItem(STORAGE_KEY_TOKEN, authRes.access_token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authRes.user));
      return authRes.user;
    } catch (err) {
      // Offline fallback: if backend is unreachable, allow standard demo user credentials
      if (email.trim().toLowerCase() === "demo@dealshield.local" && password === "password123") {
        setUser(DEFAULT_DEMO_USER);
        setToken("demo-fallback-token-jwt");
        localStorage.setItem(STORAGE_KEY_TOKEN, "demo-fallback-token-jwt");
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_DEMO_USER));
        return DEFAULT_DEMO_USER;
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (
    email: string,
    password: string,
    fullName?: string,
    organization?: string
  ): Promise<User> => {
    setIsLoading(true);
    try {
      const authRes = await api.signup({
        email,
        password,
        full_name: fullName,
        organization,
      });
      setUser(authRes.user);
      setToken(authRes.access_token);
      localStorage.setItem(STORAGE_KEY_TOKEN, authRes.access_token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(authRes.user));
      return authRes.user;
    } catch (err) {
      // Offline fallback: create local user session if backend is offline
      const fallbackUser: User = {
        id: "00000000-0000-0000-0000-000000000001",
        email: email.trim().toLowerCase(),
        full_name: fullName || "DealShield User",
        role: "Contract Sponsor",
        organization: organization || "DealShield LegalTech Hackathon",
      };
      setUser(fallbackUser);
      setToken("local-session-token");
      localStorage.setItem(STORAGE_KEY_TOKEN, "local-session-token");
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(fallbackUser));
      return fallbackUser;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
      localStorage.removeItem(STORAGE_KEY_USER);
    }
  };

  const updateUser = useCallback(
    async (data: { full_name?: string; organization?: string; role?: string }): Promise<User> => {
      setIsLoading(true);
      try {
        const updatedUser = await api.updateProfile(data);
        setUser(updatedUser);
        localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(updatedUser));
        return updatedUser;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const activeToken = token || (typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY_TOKEN) : null);
    if (!activeToken) return null;
    try {
      const freshUser = await api.getMe(activeToken);
      setUser(freshUser);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(freshUser));
      return freshUser;
    } catch {
      return null;
    }
  }, [token]);

  const setDemoUser = () => {
    setUser(DEFAULT_DEMO_USER);
    setToken("demo-offline-session-token");
    localStorage.setItem(STORAGE_KEY_TOKEN, "demo-offline-session-token");
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(DEFAULT_DEMO_USER));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        signup,
        logout,
        updateUser,
        refreshUser,
        setDemoUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
