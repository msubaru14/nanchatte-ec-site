"use client";

import { createContext, useContext } from "react";

export type AuthUser = {
  id: number;
  name: string;
  email: string;
};

export type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
};

const defaultAuthContextValue: AuthContextValue = {
  token: null,
  user: null,
  isAuthenticated: false,
};

export const AuthContext = createContext<AuthContextValue>(defaultAuthContextValue);

export function useAuth() {
  return useContext(AuthContext);
}
