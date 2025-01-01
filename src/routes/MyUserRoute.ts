// MyUserRoutes.ts

import express from "express";
import {
  getUserInfoHandler,
  updateUserInfoHandler,
} from "../controllers/MyUserController";
import authenticate from "../middleware/authenticate"; // Import the authenticate middleware

const MyUserRoutes = express.Router();

// prefix: /myuser

// Route to get user information
MyUserRoutes.get("/", authenticate, getUserInfoHandler);

// Route to update user information
MyUserRoutes.put("/update", authenticate, updateUserInfoHandler);

export default MyUserRoutes;
