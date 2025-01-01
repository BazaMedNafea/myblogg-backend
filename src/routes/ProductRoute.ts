import express from "express";
import { fetchProducts } from "../controllers/ProductController";

const ProductRouter = express.Router();

// Route to fetch products
ProductRouter.get("/", fetchProducts);

export default ProductRouter;
