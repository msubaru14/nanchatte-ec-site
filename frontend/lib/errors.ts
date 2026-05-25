import type { ErrorCode } from "../constants/errorCodes";

export const CLIENT_ERROR_CODES = {
  NETWORK_ERROR: "NETWORK_ERROR",
} as const;

export type ClientErrorCode =
  (typeof CLIENT_ERROR_CODES)[keyof typeof CLIENT_ERROR_CODES];

export type AppErrorCode = ErrorCode | ClientErrorCode;

export type ValidationDetail = {
  field?: string;
  code?: string;
  message: string;
};

const isValidationDetail = (detail: unknown): detail is ValidationDetail => {
  return (
    typeof detail === "object" &&
    detail !== null &&
    "message" in detail &&
    typeof detail.message === "string"
  );
};

export const normalizeValidationDetails = (
  details: unknown,
): ValidationDetail[] => {
  if (!Array.isArray(details)) {
    return [];
  }

  return details.filter(isValidationDetail);
};

export class ApiError extends Error {
  code: AppErrorCode;
  details: unknown;
  validationDetails: ValidationDetail[];

  constructor(code: AppErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
    this.validationDetails = normalizeValidationDetails(details);
  }
}
