import jwt, { SignOptions } from "jsonwebtoken";
import { randomUUID } from "crypto";

import { env } from "../../config/env";
import { JwtPayload, JwtPayloadInput, RefreshTokenPayloadInput } from "../types/JwtPayload";

const ACCESS_SECRET =
  env.JWT_SECRET || "development-access-secret";

const REFRESH_SECRET =
  env.JWT_REFRESH_SECRET || "development-refresh-secret";

export function signAccessToken(
  payload: JwtPayloadInput
): string {
  return jwt.sign(
    {
      ...payload,
      type: "access",
      jti: randomUUID(),
    },
    ACCESS_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.ACCESS_TOKEN_EXPIRES,
    } as SignOptions
  );
}

export function signRefreshToken(
  payload: RefreshTokenPayloadInput
): string {
  return jwt.sign(
    {
      ...payload,
      type: "refresh",
      jti: randomUUID(),
    },
    REFRESH_SECRET,
    {
      algorithm: "HS256",
      expiresIn: env.REFRESH_TOKEN_EXPIRES,
    } as SignOptions
  );
}

export function verifyAccessToken(
  token: string
): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(
  token: string
): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
