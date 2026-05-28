import { jwtVerify, SignJWT } from "jose";

import { getJwtSecret } from "@/lib/env";

const issuer = "nextjs-graphql-starter";
const audience = "notes-app";

export type AuthUser = {
  username: string;
};

export async function signAccessToken(username: string) {
  return new SignJWT({ username })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(username)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(getJwtSecret());
}

export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer,
    audience,
  });

  const username =
    typeof payload.username === "string" ? payload.username : payload.sub;

  if (!username) {
    throw new Error("Token is missing a username claim.");
  }

  return { username };
}

export function readBearerToken(authorization: string | null) {
  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    throw new Error("Authorization header must use Bearer token format.");
  }

  return token;
}
