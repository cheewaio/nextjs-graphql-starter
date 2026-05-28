import { signAccessToken } from "@/lib/auth";
import { AppError } from "@/lib/errors";

export function normalizeUsername(username: string) {
  const normalized = username.trim().toLowerCase();

  if (!normalized) {
    throw new AppError("Username is required.", 400, "BAD_USER_INPUT");
  }

  return normalized;
}

export async function login(username: string) {
  const normalized = normalizeUsername(username);

  return {
    username: normalized,
    accessToken: await signAccessToken(normalized),
  };
}
