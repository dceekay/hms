export interface JwtPayload {
  sub: string;
  email?: string;
  username?: string;
  roles?: string[];
  permissions?: string[];
  type: "access" | "refresh";
  iat?: number;
  exp?: number;
}

export interface JwtPayloadInput {
  sub: string;
  email: string;
  username: string;
  roles: string[];
  permissions: string[];
}

export type RefreshTokenPayloadInput = Pick<JwtPayloadInput, "sub">;
