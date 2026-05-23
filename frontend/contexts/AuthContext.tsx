"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import { fetchCurrentUser } from "../features/auth/api";
import type { AuthUser } from "../features/auth/api";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setUser: (user: AuthUser | null) => void;
};

const defaultAuthContextValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  setUser: () => undefined,
};

export const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setStoredUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const sessionVersion = useRef(0);

  const setUser = useCallback((nextUser: AuthUser | null) => {
    sessionVersion.current += 1;
    setStoredUser(nextUser);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const requestedVersion = sessionVersion.current;

    const restoreSession = async () => {
      try {
        const currentUser = await fetchCurrentUser();

        if (!isCancelled && requestedVersion === sessionVersion.current) {
          setStoredUser(currentUser);
        }
      } catch {
        if (!isCancelled && requestedVersion === sessionVersion.current) {
          setStoredUser(null);
        }
      } finally {
        if (!isCancelled && requestedVersion === sessionVersion.current) {
          setIsLoading(false);
        }
      }
    };

    void restoreSession();

    return () => {
      isCancelled = true;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isLoading,
      setUser,
    }),
    [isLoading, setUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
