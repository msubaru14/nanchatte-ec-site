import { ERROR_CODES } from "../../../../constants/errorCodes";
import type { BackendResponse } from "../types";

export type LoginRequestBody = {
  email: string;
  password: string;
};

export type RegisterRequestBody = LoginRequestBody & {
  name: string;
};

type ValidationDetail = {
  field: string;
  code: string;
  message: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const getString = (body: Record<string, unknown>, field: string) => {
  const value = body[field];

  return typeof value === "string" ? value : "";
};

const createValidationResponse = (
  details: ValidationDetail[],
): BackendResponse<never> => ({
  data: null,
  error: {
    code: ERROR_CODES.VALIDATION_ERROR,
    message: "validation error",
    details,
  },
});

const validateEmail = (email: string) => {
  if (email.trim() === "") {
    return {
      field: "email",
      code: "REQUIRED",
      message: "email is required",
    };
  }

  if (email.length > 255) {
    return {
      field: "email",
      code: "TOO_LONG",
      message: "email is too long",
    };
  }

  return null;
};

const validatePassword = (password: string, minLength: number) => {
  if (password === "") {
    return {
      field: "password",
      code: "REQUIRED",
      message: "password is required",
    };
  }

  if (password.length < minLength) {
    return {
      field: "password",
      code: "TOO_SHORT",
      message: "password is too short",
    };
  }

  if (password.length > 128) {
    return {
      field: "password",
      code: "TOO_LONG",
      message: "password is too long",
    };
  }

  return null;
};

export const parseJsonBody = async (request: Request) => {
  try {
    const body = await request.json();

    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
};

export const validateLoginBody = (
  body: Record<string, unknown> | null,
) => {
  if (!body) {
    return {
      data: null,
      error: createValidationResponse([
        {
          field: "body",
          code: "INVALID_FORMAT",
          message: "request body is invalid",
        },
      ]),
    };
  }

  const data = {
    email: getString(body, "email"),
    password: getString(body, "password"),
  };
  const details = [
    validateEmail(data.email),
    validatePassword(data.password, 1),
  ].filter((detail): detail is ValidationDetail => detail !== null);

  return details.length > 0
    ? { data: null, error: createValidationResponse(details) }
    : { data, error: null };
};

export const validateRegisterBody = (
  body: Record<string, unknown> | null,
) => {
  if (!body) {
    return {
      data: null,
      error: createValidationResponse([
        {
          field: "body",
          code: "INVALID_FORMAT",
          message: "request body is invalid",
        },
      ]),
    };
  }

  const data = {
    name: getString(body, "name"),
    email: getString(body, "email"),
    password: getString(body, "password"),
  };
  const details: ValidationDetail[] = [];

  if (data.name.trim() === "") {
    details.push({
      field: "name",
      code: "REQUIRED",
      message: "name is required",
    });
  } else if (Array.from(data.name.trim()).length > 100) {
    details.push({
      field: "name",
      code: "TOO_LONG",
      message: "name is too long",
    });
  }

  const emailError = validateEmail(data.email);
  const passwordError = validatePassword(data.password, 6);

  if (emailError) {
    details.push(emailError);
  }
  if (passwordError) {
    details.push(passwordError);
  }

  return details.length > 0
    ? { data: null, error: createValidationResponse(details) }
    : { data, error: null };
};
