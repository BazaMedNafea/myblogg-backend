import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const fetchEquipments = async (req: Request, res: Response) => {
  try {
    // Fetch equipments with their owner details
    const equipments = await prisma.equipment.findMany({
      where: {
        isAvailable: true, // Only fetch available equipments
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
      equipments: equipments.map((equipment) => ({
        equipmentId: equipment.equipmentId,
        name: equipment.name,
        type: equipment.type,
        condition: equipment.condition,
        price: `$${equipment.price.toFixed(2)}`,
        description: equipment.description,
        owner: {
          userId: equipment.user.userId,
          name: equipment.user.name,
          email: equipment.user.email,
          telephone: equipment.user.telephone,
        },
        createdAt: equipment.createdAt,
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

export { fetchEquipments };
