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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = "dealshield_auth_user";
const STORAGE_KEY_TOKEN = "dealshield_auth_token";

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
          const parsed = JSON.parse(storedUser);
          if (parsed && parsed.organization === "DealShield LegalTech Hackathon") {
            parsed.organization = "";
          }
          setToken(storedToken);
          setUser(parsed);

          // Background revalidation against Supabase database
          api.getMe(storedToken).then((freshUser) => {
            if (freshUser) {
              if (freshUser.organization === "DealShield LegalTech Hackathon") {
                freshUser.organization = "";
              }
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
      const cleanUser: User = {
        ...authRes.user,
        organization:
          authRes.user.organization === "DealShield LegalTech Hackathon"
            ? ""
            : authRes.user.organization || "",
      };
      setUser(cleanUser);
      setToken(authRes.access_token);
      localStorage.setItem(STORAGE_KEY_TOKEN, authRes.access_token);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cleanUser));
      return cleanUser;
    } catch (err) {
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
      throw err;
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
      const cleanUser: User = {
        ...freshUser,
        organization:
          freshUser.organization === "DealShield LegalTech Hackathon"
            ? ""
            : freshUser.organization || "",
      };
      setUser(cleanUser);
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(cleanUser));
      return cleanUser;
    } catch {
      return null;
    }
  }, [token]);

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
