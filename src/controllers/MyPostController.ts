// MyPostController.ts

import { PrismaClient } from "@prisma/client";
import { CREATED, BAD_REQUEST, OK, NOT_FOUND } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for creating a post
const createPostSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  published: z.boolean().optional().default(false),
  categoryIds: z.array(z.number()).optional(), // Array of category IDs
  tagIds: z.array(z.number()).optional(), // Array of tag IDs
});

// Schema for updating a post
const updatePostSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  content: z.string().min(1).optional(),
  published: z.boolean().optional(),
  categoryIds: z.array(z.number()).optional(),
  tagIds: z.array(z.number()).optional(),
});

// Create a new post
export const createPostHandler = catchErrors(async (req, res) => {
  // Validate the request body
  const request = createPostSchema.parse(req.body);

  // Get the userId from the authenticated user (assumed to be in req.userId)
  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, "User not authenticated");

  // Check if the categories exist (if provided)
  if (request.categoryIds && request.categoryIds.length > 0) {
    const categoriesExist = await prisma.category.findMany({
      where: { categoryId: { in: request.categoryIds } },
    });
    appAssert(
      categoriesExist.length === request.categoryIds.length,
      BAD_REQUEST,
      "One or more categories not found"
    );
  }

  // Check if the tags exist (if provided)
  if (request.tagIds && request.tagIds.length > 0) {
    const tagsExist = await prisma.tag.findMany({
      where: { tagId: { in: request.tagIds } },
    });
    appAssert(
      tagsExist.length === request.tagIds.length,
      BAD_REQUEST,
      "One or more tags not found"
    );
  }

  // Create the post
  const post = await prisma.post.create({
    data: {
      title: request.title,
      content: request.content,
      published: request.published,
      authorId: userId, // Use the authenticated user's ID
      categories: request.categoryIds
        ? {
            connect: request.categoryIds.map((id) => ({ categoryId: id })),
          }
        : undefined,
      tags: request.tagIds
        ? {
            connect: request.tagIds.map((id) => ({ tagId: id })),
          }
        : undefined,
    },
    include: {
      categories: true,
      tags: true,
    },
  });

  return res.status(CREATED).json(post);
});

// Update a post
export const updatePostHandler = catchErrors(async (req, res) => {
  const postId = parseInt(req.params.postId);
  const request = updatePostSchema.parse(req.body);

  // Check if the post exists and belongs to the authenticated user
  const existingPost = await prisma.post.findUnique({
    where: { postId },
  });
  appAssert(existingPost, NOT_FOUND, "Post not found");
  appAssert(
    existingPost.authorId === req.userId,
    BAD_REQUEST,
    "You are not the author of this post"
  );

  // Check if the categories exist (if provided)
  if (request.categoryIds && request.categoryIds.length > 0) {
    const categoriesExist = await prisma.category.findMany({
      where: { categoryId: { in: request.categoryIds } },
    });
    appAssert(
      categoriesExist.length === request.categoryIds.length,
      BAD_REQUEST,
      "One or more categories not found"
    );
  }

  // Check if the tags exist (if provided)
  if (request.tagIds && request.tagIds.length > 0) {
    const tagsExist = await prisma.tag.findMany({
      where: { tagId: { in: request.tagIds } },
    });
    appAssert(
      tagsExist.length === request.tagIds.length,
      BAD_REQUEST,
      "One or more tags not found"
    );
  }

  // Update the post
  const updatedPost = await prisma.post.update({
    where: { postId },
    data: {
      title: request.title,
      content: request.content,
      published: request.published,
      categories: request.categoryIds
        ? { set: request.categoryIds.map((id) => ({ categoryId: id })) }
        : undefined,
      tags: request.tagIds
        ? { set: request.tagIds.map((id) => ({ tagId: id })) }
        : undefined,
    },
    include: {
      categories: true,
      tags: true,
    },
  });

  return res.status(OK).json(updatedPost);
});

// Delete a post
export const deletePostHandler = catchErrors(async (req, res) => {
  const postId = parseInt(req.params.postId);

  // Check if the post exists and belongs to the authenticated user
  const existingPost = await prisma.post.findUnique({
    where: { postId },
  });
  appAssert(existingPost, NOT_FOUND, "Post not found");
  appAssert(
    existingPost.authorId === req.userId,
    BAD_REQUEST,
    "You are not the author of this post"
  );

  // Delete the post
  await prisma.post.delete({
    where: { postId },
  });

  return res.status(OK).json({ message: "Post deleted successfully" });
});

// Get all posts by the authenticated user
export const getUserPostsHandler = catchErrors(async (req, res) => {
  const posts = await prisma.post.findMany({
    where: { authorId: req.userId },
    include: {
      categories: true,
      tags: true,
    },
  });

  return res.status(OK).json(posts);
});
