import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fetchProducts = async (req: Request, res: Response) => {
  try {
    // Fetch products from the database
    const products = await prisma.product.findMany({
      where: {
        isAvailable: true, // Only available products
      },
      select: {
        productId: true,
        name: true,
        description: true,
        price: true,
        createdAt: true,
      },
    });

    // Respond with the fetched products
    res.json({
      success: true,
      products: products.map((product) => ({
        productId: product.productId,
        title: product.name,
        description: product.description,
        price: `$${product.price.toFixed(2)}`, // Format price as a string
        image: "", // Replace with actual image URL if available
        rating: 4, // Add rating logic as needed
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      // Now `error` is correctly typed as `Error`
      res.status(500).json({ success: false, message: error.message });
    } else {
      // Fallback if the error is not an instance of `Error`
      res
        .status(500)
        .json({ success: false, message: "An unknown error occurred" });
    }
  }
};

export { fetchProducts };
