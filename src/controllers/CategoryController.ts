// CategoryController.ts

import { PrismaClient } from "@prisma/client";
import { CREATED, OK, BAD_REQUEST, NOT_FOUND } from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for creating a category
const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
});

// Schema for updating a category
const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

// Get all categories (Public)
export const getCategoriesHandler = catchErrors(async (req, res) => {
  const categories = await prisma.category.findMany();
  return res.status(OK).json(categories);
});

// Get a single category by ID (Public)
export const getCategoryByIdHandler = catchErrors(async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const category = await prisma.category.findUnique({
    where: { categoryId },
  });
  return res.status(OK).json(category);
});

// Create a new category (Authenticated)
export const createCategoryHandler = catchErrors(async (req, res) => {
  const request = createCategorySchema.parse(req.body);

  // Check if the category name already exists
  const existingCategory = await prisma.category.findUnique({
    where: { name: request.name },
  });
  appAssert(!existingCategory, BAD_REQUEST, "Category name already exists");

  const category = await prisma.category.create({
    data: {
      name: request.name,
    },
  });

  return res.status(CREATED).json(category);
});

// Update a category (Authenticated)
export const updateCategoryHandler = catchErrors(async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);
  const request = updateCategorySchema.parse(req.body);

  // Check if the category exists
  const existingCategory = await prisma.category.findUnique({
    where: { categoryId },
  });
  appAssert(existingCategory, NOT_FOUND, "Category not found");

  // Check if the new name already exists
  if (request.name) {
    const nameExists = await prisma.category.findUnique({
      where: { name: request.name },
    });
    appAssert(!nameExists, BAD_REQUEST, "Category name already exists");
  }

  const updatedCategory = await prisma.category.update({
    where: { categoryId },
    data: {
      name: request.name,
    },
  });

  return res.status(OK).json(updatedCategory);
});

// Delete a category (Authenticated)
export const deleteCategoryHandler = catchErrors(async (req, res) => {
  const categoryId = parseInt(req.params.categoryId);

  // Check if the category exists
  const existingCategory = await prisma.category.findUnique({
    where: { categoryId },
  });
  appAssert(existingCategory, NOT_FOUND, "Category not found");

  await prisma.category.delete({
    where: { categoryId },
  });

  return res.status(OK).json({ message: "Category deleted successfully" });
});
