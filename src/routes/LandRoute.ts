import express from "express";
import { fetchLands } from "../controllers/LandController";

const LandRouter = express.Router();

// Route to fetch lands
LandRouter.get("/", fetchLands);

export default LandRouter;
