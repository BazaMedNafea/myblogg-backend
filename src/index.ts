// index.ts

import express, { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import "dotenv/config";
import { APP_ORIGIN, NODE_ENV, PORT } from "./constants/env";
import { checkDatabaseConnection } from "./config/db";
import cookieParser from "cookie-parser";
import errorHandler from "./middleware/errorHandler";
import catchErrors from "./utils/catchErrors";
import { OK } from "./constants/http";
import AuthRoutes from "./routes/AuthRoute";
import sessionRoutes from "./routes/SessionRoute";
import authenticate from "./middleware/authenticate";
import UserRoutes from "./routes/UserRoute";
import PostRoutes from "./routes/PostRoute"; // Updated import
import CategoryRoutes from "./routes/CategoryRoute";
import TagRoutes from "./routes/TagRoute";

const app = express();
const prisma = new PrismaClient();

// Add middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const allowedOrigins = APP_ORIGIN.split(",");

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true); // Allow requests from the specified origins
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());

// Health check endpoint
app.get("/", (req, res, next) => {
  res.status(OK).json({
    status: "health OK!",
  });
});

// Protected routes
app.use("/sessions", authenticate, sessionRoutes);
app.use("/post", authenticate, PostRoutes); // Updated to use /post

// Auth routes
app.use("/auth", AuthRoutes);

// Public routes
app.use("/user", UserRoutes);
app.use("/categories", CategoryRoutes);
app.use("/tags", TagRoutes);

// Error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  // Check the database connection at startup
  await checkDatabaseConnection();
});

export default app;
