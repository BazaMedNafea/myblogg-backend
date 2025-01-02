// AuthController.ts

import { PrismaClient } from "@prisma/client";
import { APP_ORIGIN } from "../constants/env";
import {
  CONFLICT,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
  TOO_MANY_REQUESTS,
  UNAUTHORIZED,
  CREATED,
  OK,
} from "../constants/http";
import VerificationCodeType from "../constants/verificationCodeType";
import appAssert from "../utils/appAssert";
import { hashValue, compareValue } from "../utils/bcrypt";
import {
  ONE_DAY_MS,
  fiveMinutesAgo,
  oneHourFromNow,
  oneYearFromNow,
  thirtyDaysFromNow,
} from "../utils/date";
import {
  getPasswordResetTemplate,
  getVerifyEmailTemplate,
} from "../utils/emailTemplates";
import {
  RefreshTokenPayload,
  refreshTokenSignOptions,
  signToken,
  verifyToken,
} from "../utils/jwt";

import catchErrors from "../utils/catchErrors";
import {
  emailSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  verificationCodeSchema,
} from "../schemas/AuthSchemas";
import {
  clearAuthCookies,
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  setAuthCookies,
} from "../utils/cookies";

const prisma = new PrismaClient();

export const registerHandler = catchErrors(async (req, res) => {
  const request = registerSchema.parse({
    ...req.body,
    userAgent: req.headers["user-agent"],
  });

  // Verify email is not taken
  const existingUser = await prisma.user.findUnique({
    where: { email: request.email },
  });
  appAssert(!existingUser, CONFLICT, "Email already in use");

  // Hash the password before saving
  const hashedPassword = await hashValue(request.password);

  const user = await prisma.user.create({
    data: {
      email: request.email,
      password: hashedPassword,
      fullName: request.fullName, // Only 'fullName' is included
    },
  });

  // Create session
  const session = await prisma.session.create({
    data: {
      userId: user.userId,
      userAgent: request.userAgent,
      expiresAt: thirtyDaysFromNow(),
    },
  });

  const refreshToken = signToken(
    { sessionId: session.sessionId },
    refreshTokenSignOptions
  );
  const accessToken = signToken({
    userId: user.userId,
    sessionId: session.sessionId,
  });

  return setAuthCookies({ res, accessToken, refreshToken })
    .status(CREATED)
    .json({
      userId: user.userId,
      email: user.email,
      fullName: user.fullName,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
});

export const loginHandler = catchErrors(async (req, res) => {
  const request = loginSchema.parse({
    ...req.body,
    userAgent: req.headers["user-agent"],
  });

  const user = await prisma.user.findUnique({
    where: { email: request.email },
  });
  appAssert(user, UNAUTHORIZED, "Invalid email or password");

  const isValid = await compareValue(request.password, user.password);
  appAssert(isValid, UNAUTHORIZED, "Invalid email or password");

  const session = await prisma.session.create({
    data: {
      userId: user.userId,
      userAgent: request.userAgent,
      expiresAt: thirtyDaysFromNow(),
    },
  });

  const sessionInfo: RefreshTokenPayload = {
    sessionId: session.sessionId,
  };

  const refreshToken = signToken(sessionInfo, refreshTokenSignOptions);
  const accessToken = signToken({
    ...sessionInfo,
    userId: user.userId,
  });

  return setAuthCookies({ res, accessToken, refreshToken })
    .status(OK)
    .json({ message: "Login successful" });
});

export const logoutHandler = catchErrors(async (req, res) => {
  const accessToken = req.cookies.accessToken as string | undefined;

  // If the access token exists, verify it and extract the payload
  if (accessToken) {
    const { payload } = verifyToken(accessToken || "");

    if (payload) {
      console.log("Deleting session for sessionId:", payload.sessionId);

      // Clear cookies explicitly (clear both access and refresh token cookies)
      clearAuthCookies(res);

      // Remove session from the database
      await prisma.session.delete({
        where: { sessionId: payload.sessionId },
      });
    }
  }

  // Clear cookies if no access token is found
  return clearAuthCookies(res)
    .status(OK)
    .json({ message: "Logout successful" });
});

export const refreshHandler = catchErrors(async (req, res) => {
  const refreshToken = req.cookies.refreshToken as string | undefined;
  appAssert(refreshToken, UNAUTHORIZED, "Missing refresh token");

  const { payload } = verifyToken<RefreshTokenPayload>(refreshToken, {
    secret: refreshTokenSignOptions.secret,
  });
  appAssert(payload, UNAUTHORIZED, "Invalid refresh token");

  const session = await prisma.session.findUnique({
    where: { sessionId: payload.sessionId },
  });

  const now = Date.now();
  appAssert(
    session && session.expiresAt.getTime() > now,
    UNAUTHORIZED,
    "Session expired"
  );

  // refresh the session if it expires in the next 24hrs
  const sessionNeedsRefresh = session.expiresAt.getTime() - now <= ONE_DAY_MS;
  let newRefreshToken;
  if (sessionNeedsRefresh) {
    await prisma.session.update({
      where: { sessionId: session.sessionId },
      data: { expiresAt: thirtyDaysFromNow() },
    });

    newRefreshToken = signToken(
      { sessionId: session.sessionId },
      refreshTokenSignOptions
    );
  }

  const accessToken = signToken({
    userId: session.userId,
    sessionId: session.sessionId,
  });

  if (newRefreshToken) {
    res.cookie("refreshToken", newRefreshToken, getRefreshTokenCookieOptions());
  }
  return res
    .status(OK)
    .cookie("accessToken", accessToken, getAccessTokenCookieOptions())
    .json({ message: "Access token refreshed" });
});
