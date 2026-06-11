import { ERROR_CODES } from "../../../constants/errorCodes";
import { ApiError } from "../../../lib/errors";
import type { AdminProductFieldErrors } from "./AdminProductForm";

export const getAdminProductSaveErrorMessage = (
  error: unknown,
  fallbackMessage: string,
) => {
  if (!(error instanceof ApiError)) {
    return fallbackMessage;
  }

  if (
    error.code === ERROR_CODES.VALIDATION_ERROR ||
    error.code === ERROR_CODES.INVALID_REQUEST
  ) {
    const messages = error.validationDetails.map((detail) => detail.message);

    return messages.length > 0 ? messages.join("\n") : "入力内容を確認してください。";
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return "管理者権限がないため、商品を保存できません。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "対象商品が見つかりませんでした。";
  }

  return error.message || fallbackMessage;
};

export const getAdminProductFieldErrors = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return {};
  }

  return error.validationDetails.reduce<AdminProductFieldErrors>(
    (fieldErrors, detail) => {
      if (!detail.field) {
        return fieldErrors;
      }

      const field = detail.field as keyof AdminProductFieldErrors;
      fieldErrors[field] = [...(fieldErrors[field] ?? []), detail.message];

      return fieldErrors;
    },
    {},
  );
};
