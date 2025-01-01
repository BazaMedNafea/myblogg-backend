import express from "express";
import {
  addProductHandler,
  getUserProductsHandler,
  updateProductHandler,
  deleteProductHandler,
  rentProductHandler,
} from "../controllers/MyProductController";
import authenticate from "../middleware/authenticate";

const MyProductRoute = express.Router();

// prefix: /myproduct

// Add a new product
MyProductRoute.post("/addproduct", authenticate, addProductHandler);

// Get user's products
MyProductRoute.get("/products", authenticate, getUserProductsHandler);

// Update a specific product
MyProductRoute.put("/products/:productId", authenticate, updateProductHandler);

// Delete a specific product
MyProductRoute.delete(
  "/products/:productId",
  authenticate,
  deleteProductHandler
);

// Rent a product
MyProductRoute.post(
  "/products/:productId/rent",
  authenticate,
  rentProductHandler
);

export default MyProductRoute;
