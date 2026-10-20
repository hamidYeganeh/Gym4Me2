function unauthorizedCode(error: unknown) {
  return error &&
    typeof error === "object" &&
    "status" in error &&
    error.status === 401 &&
    "code" in error
    ? error.code
    : undefined;
}

/** A failed challenge does not mean the device's existing session has ended. */
export function isSessionEndedError(error: unknown) {
  const code = unauthorizedCode(error);
  return (
    code === "Backend.signInFirst" ||
    code === "Backend.theSessionHasEndedSignInAgain"
  );
}
export function isCredentialRejection(error: unknown) {
  const code = unauthorizedCode(error);
  return (
    code === "Backend.theCodeIsIncorrectOrExpired" ||
    code === "Backend.invalidCredentials"
  );
}
