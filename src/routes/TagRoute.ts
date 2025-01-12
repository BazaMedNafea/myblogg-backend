// TagRoutes.ts

import { Router } from "express";
import {
  getTagsHandler,
  getTagByIdHandler,
  createTagHandler,
  updateTagHandler,
  deleteTagHandler,
} from "../controllers/TagController";

import authenticate from "../middleware/authenticate";

const TagRoutes = Router();

// Public routes
TagRoutes.get("/", getTagsHandler); // Get all tags
TagRoutes.get("/:tagId", getTagByIdHandler); // Get a tag by ID

// Authenticated routes (prefixed with /my/)
TagRoutes.post("/my/create", authenticate, createTagHandler); // Create a tag
TagRoutes.put("/my/:tagId", authenticate, updateTagHandler); // Update a tag
TagRoutes.delete("/my/:tagId", authenticate, deleteTagHandler); // Delete a tag

export default TagRoutes;
