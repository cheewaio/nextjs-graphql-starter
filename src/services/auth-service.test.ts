// @vitest-environment node

import { describe, expect, it } from "vitest";

import { verifyAccessToken } from "@/lib/auth";
import { login, normalizeUsername } from "@/services/auth-service";

describe("auth service", () => {
  it("normalizes usernames", () => {
    expect(normalizeUsername(" User@Example.com ")).toBe("user@example.com");
  });

  it("creates a token carrying the username claim", async () => {
    const result = await login("User@Example.com");

    expect(result.username).toBe("user@example.com");
    await expect(verifyAccessToken(result.accessToken)).resolves.toEqual({
      username: "user@example.com",
    });
  });
});
