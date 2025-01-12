// CategoryRoutes.ts

import { Router } from "express";
import {
  getCategoriesHandler,
  getCategoryByIdHandler,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "../controllers/CategoryController";

import authenticate from "../middleware/authenticate";

const CategoryRoutes = Router();

// Public routes
CategoryRoutes.get("/", getCategoriesHandler); // Get all categories
CategoryRoutes.get("/:categoryId", getCategoryByIdHandler); // Get a category by ID

// Authenticated routes (prefixed with /my/)
CategoryRoutes.post("/my/create", authenticate, createCategoryHandler); // Create a category
CategoryRoutes.put("/my/:categoryId", authenticate, updateCategoryHandler); // Update a category
CategoryRoutes.delete("/my/:categoryId", authenticate, deleteCategoryHandler); // Delete a category

export default CategoryRoutes;
