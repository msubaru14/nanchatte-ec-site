"use client";

import { createContext, useContext } from "react";

import type { AuthUser } from "../features/auth/api";

export type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
};

const defaultAuthContextValue: AuthContextValue = {
  user: null,
  isAuthenticated: false,
};

export const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

export function useAuth() {
  return useContext(AuthContext);
}
