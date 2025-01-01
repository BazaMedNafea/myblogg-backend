// UserRoutes.ts

import express from "express";
import { getUserPublicInfoHandler } from "../controllers/UserController";

const router = express.Router();

// prefix: /user
router.get("/:userId", getUserPublicInfoHandler);

export default router;
