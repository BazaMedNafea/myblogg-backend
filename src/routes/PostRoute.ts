// PostRoute.ts

import { Router } from "express";
import {
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  getUserPostsHandler,
  getPostByIdHandler, // Import the new handler
} from "../controllers/PostController"; // Updated import
import authenticate from "../middleware/authenticate";

const PostRoutes = Router();

// Prefix: /post

// Authenticated routes (prefixed with /my/)
PostRoutes.post("/my/create", authenticate, createPostHandler); // Create a new post
PostRoutes.get("/my/get", authenticate, getUserPostsHandler); // Get all posts by the authenticated user
PostRoutes.get("/my/:postId", authenticate, getPostByIdHandler); // Get a post by ID
PostRoutes.put("/my/:postId", authenticate, updatePostHandler); // Update a post by ID
PostRoutes.delete("/my/:postId", authenticate, deletePostHandler); // Delete a post by ID

export default PostRoutes;
