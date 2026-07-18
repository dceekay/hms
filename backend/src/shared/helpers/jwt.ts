import jwt from "jsonwebtoken";
import { env } from "../../config/env";
import { JwtPayload, JwtPayloadInput } from "../types/JwtPayload";

const ACCESS_TOKEN_SECRET = env.JWT_SECRET || "development-access-secret";
const REFRESH_TOKEN_SECRET = env.JWT_REFRESH_SECRET || "development-refresh-secret";

function getSecret(type: JwtPayload["type"]): string {
  return type === "access" ? ACCESS_TOKEN_SECRET : REFRESH_TOKEN_SECRET;
}

export function signAccessToken(payload: JwtPayloadInput): string {
  return jwt.sign({ ...payload, type: "access" }, getSecret("access"), {
    expiresIn: env.ACCESS_TOKEN_EXPIRES,
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: JwtPayloadInput): string {
  return jwt.sign({ ...payload, type: "refresh" }, getSecret("refresh"), {
    expiresIn: env.REFRESH_TOKEN_EXPIRES,
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret("access")) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, getSecret("refresh")) as JwtPayload;
}
