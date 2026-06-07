const DEFAULT_RETURN_TO = "/products";
const DEFAULT_ADMIN_RETURN_TO = "/admin";
const RETURN_TO_VALIDATION_ORIGIN = "http://return-to.invalid";

export const getSafeReturnTo = (
  returnTo: string | string[] | null | undefined,
) => {
  const candidate = Array.isArray(returnTo) ? returnTo[0] : returnTo;

  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return DEFAULT_RETURN_TO;
  }

  try {
    const url = new URL(candidate, RETURN_TO_VALIDATION_ORIGIN);

    if (url.origin !== RETURN_TO_VALIDATION_ORIGIN) {
      return DEFAULT_RETURN_TO;
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_TO;
  }
};

export const getSafeAdminReturnTo = (
  returnTo: string | string[] | null | undefined,
) => {
  const safeReturnTo = getSafeReturnTo(returnTo);

  if (
    safeReturnTo === DEFAULT_ADMIN_RETURN_TO ||
    safeReturnTo.startsWith(`${DEFAULT_ADMIN_RETURN_TO}/`)
  ) {
    return safeReturnTo;
  }

  return DEFAULT_ADMIN_RETURN_TO;
};
