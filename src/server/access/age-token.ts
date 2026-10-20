import { SignJWT, jwtVerify } from "jose";

import { ageTokenTtlHours } from "@/shared/config/flags";

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is required");
  }
  return new TextEncoder().encode(secret);
}

export async function signAgeToken() {
  const ttlHours = ageTokenTtlHours();
  const token = await new SignJWT({ age_ok: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttlHours}h`)
    .sign(secretKey());
  return { token, expiresInHours: ttlHours };
}

export async function verifyAgeToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.age_ok !== true) {
      return false;
    }
    if (typeof payload.sub === "string") {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}
