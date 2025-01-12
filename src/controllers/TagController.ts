// TagController.ts

import { PrismaClient } from "@prisma/client";
import { CREATED, OK, BAD_REQUEST, NOT_FOUND } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for creating a tag
const createTagSchema = z.object({
  name: z.string().min(1).max(100),
});

// Schema for updating a tag
const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Get all tags (Public)
export const getTagsHandler = catchErrors(async (req, res) => {
  const tags = await prisma.tag.findMany();
  return res.status(OK).json(tags);
});

// Get a single tag by ID (Public)
export const getTagByIdHandler = catchErrors(async (req, res) => {
  const tagId = parseInt(req.params.tagId);
  const tag = await prisma.tag.findUnique({
    where: { tagId },
  });
  return res.status(OK).json(tag);
});

// Create a new tag (Authenticated)
export const createTagHandler = catchErrors(async (req, res) => {
  const request = createTagSchema.parse(req.body);

  // Check if the tag name already exists
  const existingTag = await prisma.tag.findUnique({
    where: { name: request.name },
  });
  appAssert(!existingTag, BAD_REQUEST, "Tag name already exists");

  const tag = await prisma.tag.create({
    data: {
      name: request.name,
    },
  });

  return res.status(CREATED).json(tag);
});

// Update a tag (Authenticated)
export const updateTagHandler = catchErrors(async (req, res) => {
  const tagId = parseInt(req.params.tagId);
  const request = updateTagSchema.parse(req.body);

  // Check if the tag exists
  const existingTag = await prisma.tag.findUnique({
    where: { tagId },
  });
  appAssert(existingTag, NOT_FOUND, "Tag not found");

  // Check if the new name already exists
  if (request.name) {
    const nameExists = await prisma.tag.findUnique({
      where: { name: request.name },
    });
    appAssert(!nameExists, BAD_REQUEST, "Tag name already exists");
  }

  const updatedTag = await prisma.tag.update({
    where: { tagId },
    data: {
      name: request.name,
    },
  });

  return res.status(OK).json(updatedTag);
});

// Delete a tag (Authenticated)
export const deleteTagHandler = catchErrors(async (req, res) => {
  const tagId = parseInt(req.params.tagId);

  // Check if the tag exists
  const existingTag = await prisma.tag.findUnique({
    where: { tagId },
  });
  appAssert(existingTag, NOT_FOUND, "Tag not found");

  await prisma.tag.delete({
    where: { tagId },
  });

  return res.status(OK).json({ message: "Tag deleted successfully" });
});
