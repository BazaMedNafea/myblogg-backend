// MyPostRoute.ts

import { Router } from "express";
import {
  createPostHandler,
  updatePostHandler,
  deletePostHandler,
  getUserPostsHandler,
} from "../controllers/MyPostController";

const MyPostRoutes = Router();

// Prefix: /mypost
MyPostRoutes.post("/create", createPostHandler); // Create a new post
MyPostRoutes.get("/get", getUserPostsHandler); // Get all posts by the authenticated user
MyPostRoutes.put("/:postId", updatePostHandler); // Update a post by ID
MyPostRoutes.delete("/:postId", deletePostHandler); // Delete a post by ID

export default MyPostRoutes;
