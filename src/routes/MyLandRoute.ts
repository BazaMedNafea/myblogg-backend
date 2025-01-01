// RentLandRoute.ts

import express from "express";
import {
  rentLandHandler,
  addLandHandler,
  getUserLandsHandler,
  updateLandHandler,
  deleteLandHandler,
} from "../controllers/MyLandController";
import authenticate from "../middleware/authenticate";

const RentLandRoute = express.Router();

// prefix: /land
RentLandRoute.post("/rent", authenticate, rentLandHandler);
RentLandRoute.post("/add", authenticate, addLandHandler);
RentLandRoute.get("/list", authenticate, getUserLandsHandler);
RentLandRoute.put("/update/:landId", authenticate, updateLandHandler);
RentLandRoute.delete("/delete/:landId", authenticate, deleteLandHandler);

export default RentLandRoute;
