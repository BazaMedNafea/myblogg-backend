// PostController.ts

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
  const request = createPostSchema.parse(req.body);

  const userId = req.userId;
  appAssert(userId, BAD_REQUEST, "User not authenticated");

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

  const post = await prisma.post.create({
    data: {
      title: request.title,
      content: request.content,
      published: request.published,
      authorId: userId,
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

  const existingPost = await prisma.post.findUnique({
    where: { postId },
  });
  appAssert(existingPost, NOT_FOUND, "Post not found");
  appAssert(
    existingPost.authorId === req.userId,
    BAD_REQUEST,
    "You are not the author of this post"
  );

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

  const existingPost = await prisma.post.findUnique({
    where: { postId },
  });
  appAssert(existingPost, NOT_FOUND, "Post not found");
  appAssert(
    existingPost.authorId === req.userId,
    BAD_REQUEST,
    "You are not the author of this post"
  );

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

// Get a post by ID
export const getPostByIdHandler = catchErrors(async (req, res) => {
  const postId = parseInt(req.params.postId);

  const post = await prisma.post.findUnique({
    where: { postId },
    include: {
      categories: true,
      tags: true,
    },
  });

  appAssert(post, NOT_FOUND, "Post not found");
  appAssert(
    post.authorId === req.userId,
    BAD_REQUEST,
    "You are not the author of this post"
  );

  return res.status(OK).json(post);
});
