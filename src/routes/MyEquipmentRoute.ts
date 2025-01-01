// EquipmentRoute.ts

import express from "express";
import {
  rentEquipmentHandler,
  addEquipmentHandler,
  getUserEquipmentHandler,
  updateEquipmentHandler,
  deleteEquipmentHandler,
} from "../controllers/MyEquipmentController";
import authenticate from "../middleware/authenticate";

const EquipmentRoute = express.Router();

// prefix: /myequipment
EquipmentRoute.post("/rent", authenticate, rentEquipmentHandler);
EquipmentRoute.post("/add", authenticate, addEquipmentHandler);
EquipmentRoute.get("/list", authenticate, getUserEquipmentHandler);
EquipmentRoute.put("/:equipmentId", authenticate, updateEquipmentHandler);
EquipmentRoute.delete("/:equipmentId", authenticate, deleteEquipmentHandler);

export default EquipmentRoute;
