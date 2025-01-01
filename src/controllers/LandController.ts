import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fetchLands = async (req: Request, res: Response) => {
  try {
    // Fetch lands with their owner details
    const lands = await prisma.land.findMany({
      where: {
        isAvailable: true, // Only fetch available lands
      },
      include: {
        user: {
          select: {
            userId: true,
            name: true,
            email: true,
            telephone: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc", // Optional: order by most recently created
      },
    });

    // Transform the response to a more frontend-friendly format
    res.json({
      success: true,
      lands: lands.map((land) => ({
        landId: land.landId,
        location: land.location,
        area: land.area,
        soilType: land.soilType,
        price: `$${land.price.toFixed(2)}`,
        description: land.description,
        owner: {
          userId: land.user.userId,
          name: land.user.name,
          email: land.user.email,
          telephone: land.user.telephone,
        },
        createdAt: land.createdAt,
      })),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    } else {
      res.status(500).json({
        success: false,
        message: "An unknown error occurred",
      });
    }
  }
};

export { fetchLands };
