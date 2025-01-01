//UserController.ts

import { NOT_FOUND, OK } from "../constants/http";
import { PrismaClient } from "@prisma/client";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";

const prisma = new PrismaClient();

export const getUserPublicInfoHandler = catchErrors(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { userId: req.params.userId }, // Changed from 'id' to 'userId'
    select: {
      userId: true,
      name: true, // Changed from 'name' to 'Name'
    },
  });

  appAssert(user, NOT_FOUND, "User not found");

  return res.status(OK).json(user);
});
