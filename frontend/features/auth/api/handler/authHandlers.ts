import { NextResponse } from "next/server";

import {
  fetchCurrentUserWithBackend,
  loginWithBackend,
  logoutWithBackend,
  refreshWithBackend,
  registerWithBackend,
} from "../server/authServer";
import {
  parseJsonBody,
  validateLoginBody,
  validateRegisterBody,
} from "../schemas";

export const handleLogin = async (request: Request) => {
  const validation = validateLoginBody(await parseJsonBody(request));

  if (validation.error) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { response, json } = await loginWithBackend(validation.data);

  return NextResponse.json(json, { status: response.status });
};

export const handleRegister = async (request: Request) => {
  const validation = validateRegisterBody(await parseJsonBody(request));

  if (validation.error) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { response, json } = await registerWithBackend(validation.data);

  return NextResponse.json(json, { status: response.status });
};

export const handleRefresh = async () => {
  const { status, json } = await refreshWithBackend();

  return NextResponse.json(json, { status });
};

export const handleLogout = async () => {
  const { status, json } = await logoutWithBackend();

  return NextResponse.json(json, { status });
};

export const handleMe = async () => {
  const { response, json } = await fetchCurrentUserWithBackend();

  return NextResponse.json(json, { status: response.status });
};
