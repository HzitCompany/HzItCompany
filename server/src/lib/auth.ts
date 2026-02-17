import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import type { Request } from "express";

import { env } from "./env.js";

export type AuthRole = "client" | "admin";

export type AuthProvider = "password" | "otp";

export type AuthTokenPayload = {
  sub: string;
  email?: string;
  role: AuthRole;
  name?: string;
  phone?: string;
  provider?: AuthProvider;
};

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 12);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

export function signToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: "7d" });
}

export function getBearerToken(req: Request) {
  const header = req.get("authorization");
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}
