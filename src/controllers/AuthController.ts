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
import { sendMail } from "../utils/sendMail";
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

  // verify email is not taken
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
      name: request.name,
      telephone: request.telephone,
    },
  });
  const verificationCode = await prisma.verificationCode.create({
    data: {
      userId: user.userId,
      type: VerificationCodeType.EmailVerification,
      expiresAt: oneYearFromNow(),
    },
  });

  const url = `${APP_ORIGIN}/email/verify/${verificationCode.verificationCodeId}`;

  // send verification email
  const { error } = await sendMail({
    to: user.email,
    ...getVerifyEmailTemplate(url),
  });
  if (error) console.error(error);

  // create session
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
      name: user.name,
      telephone: user.telephone,
      verified: user.verified,
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

export const verifyEmailHandler = catchErrors(async (req, res) => {
  const verificationCode = verificationCodeSchema.parse(req.params.code);

  const validCode = await prisma.verificationCode.findUnique({
    where: {
      verificationCodeId: verificationCode,
      type: VerificationCodeType.EmailVerification,
    },
    include: { user: true },
  });

  appAssert(
    validCode && validCode.expiresAt > new Date(),
    NOT_FOUND,
    "Invalid or expired verification code"
  );

  const updatedUser = await prisma.user.update({
    where: { userId: validCode.userId },
    data: { verified: true },
  });

  await prisma.verificationCode.delete({
    where: { verificationCodeId: verificationCode },
  });

  return res.status(OK).json({ message: "Email was successfully verified" });
});

export const sendPasswordResetHandler = catchErrors(async (req, res) => {
  const email = emailSchema.parse(req.body.email);

  const user = await prisma.user.findUnique({ where: { email } });
  appAssert(user, NOT_FOUND, "User not found");

  // check for max password reset requests (2 emails in 5min)
  const fiveMinAgo = fiveMinutesAgo();
  const count = await prisma.verificationCode.count({
    where: {
      userId: user.userId,
      type: VerificationCodeType.PasswordReset,
      createdAt: { gt: fiveMinAgo },
    },
  });
  appAssert(
    count <= 1,
    TOO_MANY_REQUESTS,
    "Too many requests, please try again later"
  );

  const expiresAt = oneHourFromNow();
  const verificationCode = await prisma.verificationCode.create({
    data: {
      userId: user.userId,
      type: VerificationCodeType.PasswordReset,
      expiresAt,
    },
  });

  const url = `${APP_ORIGIN}/password/reset?code=${
    verificationCode.verificationCodeId
  }&exp=${expiresAt.getTime()}`;

  const { data, error } = await sendMail({
    to: email,
    ...getPasswordResetTemplate(url),
  });

  appAssert(
    data?.id,
    INTERNAL_SERVER_ERROR,
    `${error?.name} - ${error?.message}`
  );
  return res.status(OK).json({ message: "Password reset email sent" });
});

export const resetPasswordHandler = catchErrors(async (req, res) => {
  const request = resetPasswordSchema.parse(req.body);

  const validCode = await prisma.verificationCode.findUnique({
    where: {
      verificationCodeId: request.verificationCode,
      type: VerificationCodeType.PasswordReset,
    },
  });

  appAssert(
    validCode && validCode.expiresAt > new Date(),
    NOT_FOUND,
    "Invalid or expired verification code"
  );

  // Hash the new password before updating
  const hashedPassword = await hashValue(request.password);
  const updatedUser = await prisma.user.update({
    where: { userId: validCode.userId },
    data: { password: hashedPassword },
  });

  // Delete all sessions for this user
  await prisma.session.deleteMany({
    where: { userId: validCode.userId },
  });

  await prisma.verificationCode.delete({
    where: { verificationCodeId: request.verificationCode },
  });

  return clearAuthCookies(res)
    .status(OK)
    .json({ message: "Password was reset successfully" });
});
