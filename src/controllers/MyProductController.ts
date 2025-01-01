import { PrismaClient } from "@prisma/client";
import {
  CREATED,
  OK,
  NO_CONTENT,
  BAD_REQUEST,
  NOT_FOUND,
} from "../constants/http";
import appAssert from "../utils/appAssert";
import catchErrors from "../utils/catchErrors";
import { z } from "zod";

const prisma = new PrismaClient();

// Schema for adding a new product
const addProductSchema = z.object({
  name: z.string().min(2).max(100),
  type: z.string().min(2).max(50),
  price: z.number().positive(),
  quantity: z.number().int().positive(),
  description: z.string().min(10).max(500),
});

// Schema for updating a product
const updateProductSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  type: z.string().min(2).max(50).optional(),
  price: z.number().positive().optional(),
  quantity: z.number().int().positive().optional(),
  description: z.string().min(10).max(500).optional(),
  isAvailable: z.boolean().optional(),
});

// Add Product Handler
export const addProductHandler = catchErrors(async (req, res) => {
  const productData = addProductSchema.parse(req.body);

  const newProduct = await prisma.product.create({
    data: {
      userId: req.userId,
      name: productData.name,
      type: productData.type,
      price: productData.price,
      quantity: productData.quantity,
      description: productData.description,
      isAvailable: true,
    },
    select: {
      productId: true,
      name: true,
      type: true,
      price: true,
      quantity: true,
      description: true,
      createdAt: true,
    },
  });

  return res.status(CREATED).json(newProduct);
});

// Get User's Products Handler
export const getUserProductsHandler = catchErrors(async (req, res) => {
  const products = await prisma.product.findMany({
    where: { userId: req.userId },
    select: {
      productId: true,
      name: true,
      type: true,
      price: true,
      quantity: true,
      description: true,
      isAvailable: true,
      createdAt: true,
    },
  });

  return res.status(OK).json(products);
});

// Update Product Handler
export const updateProductHandler = catchErrors(async (req, res) => {
  const productId = req.params.productId;
  const productData = updateProductSchema.parse(req.body);

  // First, verify the product belongs to the logged-in user
  const existingProduct = await prisma.product.findUnique({
    where: {
      productId: productId,
      userId: req.userId,
    },
  });

  if (!existingProduct) {
    return res
      .status(NOT_FOUND)
      .json({ message: "Product not found or unauthorized" });
  }

  const updatedProduct = await prisma.product.update({
    where: { productId: productId },
    data: productData,
    select: {
      productId: true,
      name: true,
      type: true,
      price: true,
      quantity: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(OK).json(updatedProduct);
});

// Delete Product Handler
export const deleteProductHandler = catchErrors(async (req, res) => {
  const productId = req.params.productId;

  // First, verify the product belongs to the logged-in user
  const existingProduct = await prisma.product.findUnique({
    where: {
      productId: productId,
      userId: req.userId,
    },
  });

  if (!existingProduct) {
    return res
      .status(NOT_FOUND)
      .json({ message: "Product not found or unauthorized" });
  }

  // Delete the product
  await prisma.product.delete({
    where: { productId: productId },
  });

  return res.status(NO_CONTENT).send();
});

// Rent Product Handler
export const rentProductHandler = catchErrors(async (req, res) => {
  const productId = req.params.productId;

  // Validate rent details
  const rentSchema = z.object({
    quantity: z.number().int().positive(),
    startDate: z.string().datetime(),
    endDate: z.string().datetime(),
    rentalPrice: z.number().positive(),
  });

  const rentData = rentSchema.parse(req.body);

  // Check if the product exists and is available
  const product = await prisma.product.findUnique({
    where: { productId: productId },
  });

  if (!product) {
    return res.status(NOT_FOUND).json({ message: "Product not found" });
  }

  if (!product.isAvailable || product.quantity < rentData.quantity) {
    return res
      .status(BAD_REQUEST)
      .json({ message: "Product not available for rent" });
  }

  // Create rent product record
  const rentProduct = await prisma.rentProduct.create({
    data: {
      productId: productId,
      ownerId: product.userId,
      renterId: req.userId,
      startDate: new Date(rentData.startDate),
      endDate: new Date(rentData.endDate),
      rentalPrice: rentData.rentalPrice,
    },
    select: {
      rentProductId: true,
      productId: true,
      startDate: true,
      endDate: true,
      rentalPrice: true,
    },
  });

  return res.status(CREATED).json(rentProduct);
});
