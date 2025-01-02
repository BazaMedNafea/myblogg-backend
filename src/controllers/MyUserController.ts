// MyUserController.ts

import { PrismaClient } from "@prisma/client";
import { OK, NOT_FOUND, BAD_REQUEST } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import { z } from "zod";

const prisma = new PrismaClient();

// Define schema for user update
const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  telephone: z.string().optional(),
  email: z.string().email().optional(),
});

// Schema for adding a new product
const addProductSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.string().min(2).max(50),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  description: z.string().min(10).max(500),
});

export const getUserInfoHandler = catchErrors(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { userId: req.userId },
    select: {
      userId: true,
      email: true,
      fullName: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  appAssert(user, NOT_FOUND, "User not found");

  return res.status(OK).json(user);
});

export const updateUserInfoHandler = catchErrors(async (req, res) => {
  const request = updateUserSchema.parse(req.body);

  const updateData: {
    fullName?: string;
    telephone?: string;
    email?: string;
  } = {};

  if (request.fullName) updateData.fullName = request.fullName;
  if (request.telephone) updateData.telephone = request.telephone;
  if (request.email) {
    const existingUser = await prisma.user.findUnique({
      where: { email: request.email },
    });
    appAssert(!existingUser, BAD_REQUEST, "Email already in use");
    updateData.email = request.email;
  }

  // Ensure there's something to update
  appAssert(
    Object.keys(updateData).length > 0,
    BAD_REQUEST,
    "No fields to update"
  );

  const updatedUser = await prisma.user.update({
    where: { userId: req.userId },
    data: updateData,
    select: {
      userId: true,
      fullName: true,
      email: true,
      updatedAt: true,
    },
  });

  return res.status(OK).json(updatedUser);
});
