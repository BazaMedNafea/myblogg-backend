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
import MyUserRoutes from "./routes/MyUserRoute"; // Import MyUserRoutes
import UserRoutes from "./routes/UserRoute"; // Import UserRoutes
import MyProductRoute from "./routes/MyProductRoute";
import ProductRouter from "./routes/ProductRoute";
import MyLandRoute from "./routes/MyLandRoute";
import LandRoutes from "./routes/LandRoute";
import MyEquipmentRoute from "./routes/MyEquipmentRoute";
import EquipmentRouter from "./routes/EquipmentRoute";

const app = express();
const prisma = new PrismaClient();

// add middleware
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

// protected routes
app.use("/sessions", authenticate, sessionRoutes);
app.use("/myuser", authenticate, MyUserRoutes); // Protected user routes (requires authentication)
app.use("/myproduct", authenticate, MyProductRoute); // Protected user routes (requires authentication)
app.use("/myland", authenticate, MyLandRoute); // Protected user routes (requires authentication)
app.use("/myequipment", authenticate, MyEquipmentRoute); // Protected user routes (requires authentication)

// auth routes
app.use("/auth", AuthRoutes);

// public routes
app.use("/user", UserRoutes); // Public user routes
app.use("/products", ProductRouter); // Public user routes
app.use("/lands", LandRoutes);
app.use("/equipment", EquipmentRouter);

// error handler
app.use(errorHandler);

// Start the server
app.listen(PORT, async () => {
  console.log(`Server started on http://localhost:${PORT}`);
  // Check the database connection at startup
  await checkDatabaseConnection();
});

export default app;
