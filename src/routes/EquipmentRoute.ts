import express from "express";
import { fetchEquipments } from "../controllers/EquipmentController";

const EquipmentRouter = express.Router();

// Route to fetch equipments
EquipmentRouter.get("/", fetchEquipments);

export default EquipmentRouter;
