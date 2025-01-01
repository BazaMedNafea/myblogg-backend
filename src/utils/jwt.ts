import jwt, { VerifyOptions, SignOptions } from "jsonwebtoken";
import Audience from "../constants/audience";
import { JWT_REFRESH_SECRET, JWT_SECRET } from "../constants/env";
import { Prisma, PrismaClient } from "@prisma/client";

// Updated type definitions to match Prisma schema
export type RefreshTokenPayload = {
  sessionId: string; // Changed from Prisma type to string, matching the cuid() default
};

export type AccessTokenPayload = {
  userId: string; // Changed from Prisma type to string, matching the cuid() default
  sessionId: string;
};

type SignOptionsAndSecret = SignOptions & {
  secret: string;
};

const defaults: SignOptions = {
  audience: [Audience.User],
};

const accessTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: "15m",
  secret: JWT_SECRET,
};

export const refreshTokenSignOptions: SignOptionsAndSecret = {
  expiresIn: "30d",
  secret: JWT_REFRESH_SECRET,
};

export const signToken = (
  payload: AccessTokenPayload | RefreshTokenPayload,
  options?: SignOptionsAndSecret
) => {
  const { secret, ...signOpts } = options || accessTokenSignOptions;
  return jwt.sign(payload, secret, {
    ...defaults,
    ...signOpts,
  });
};

export const verifyToken = <TPayload extends object = AccessTokenPayload>(
  token: string,
  options?: VerifyOptions & {
    secret?: string;
  }
) => {
  const { secret = JWT_SECRET, ...verifyOpts } = options || {};
  try {
    const payload = jwt.verify(token, secret, {
      ...defaults,
      ...verifyOpts,
    }) as TPayload;
    return {
      payload,
    };
  } catch (error: any) {
    return {
      error: error.message,
    };
  }
};
