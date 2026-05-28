export function getJwtSecret() {
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV !== "production" ? "dev-secret" : undefined);

  if (!secret) {
    throw new Error("JWT_SECRET is required.");
  }

  return new TextEncoder().encode(secret);
}

export function isPlaygroundEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.GRAPHQL_PLAYGROUND_ENABLED === "true"
  );
}

export function isLocalAuthBypassEnabled() {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.GRAPHQL_AUTH_BYPASS_LOCAL === "true"
  );
}
