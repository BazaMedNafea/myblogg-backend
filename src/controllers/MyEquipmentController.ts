// EquipmentController.ts

import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CREATED, BAD_REQUEST, OK, NO_CONTENT } from "../constants/http";
import catchErrors from "../utils/catchErrors";
import appAssert from "../utils/appAssert";

const prisma = new PrismaClient();

// Schema for renting equipment
const rentEquipmentSchema = z.object({
  equipmentId: z.string().min(1, "Equipment ID is required"),
  startDate: z.string().datetime({ message: "Invalid start date" }),
  endDate: z.string().datetime({ message: "Invalid end date" }),
});

// Schema for adding equipment
const addEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  condition: z.enum(["NEW", "USED", "REFURBISHED", "DAMAGED"]),
  price: z.number().positive("Price must be a positive number"),
  description: z.string().optional(),
});

// Schema for updating equipment
const updateEquipmentSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  type: z.string().min(1, "Type is required").optional(),
  condition: z.enum(["NEW", "USED", "REFURBISHED", "DAMAGED"]).optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  description: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

export const rentEquipmentHandler = catchErrors(async (req, res) => {
  // Validate the request body against the schema
  const rentData = rentEquipmentSchema.parse(req.body);

  // Retrieve the equipment to ensure it exists and is available
  const equipment = await prisma.equipment.findUnique({
    where: {
      equipmentId: rentData.equipmentId,
      isAvailable: true,
    },
  });

  // Check if equipment exists and is available
  appAssert(
    equipment,
    BAD_REQUEST,
    "Equipment not found or not available for rent"
  );

  // Ensure the equipment is not owned by the renter
  appAssert(
    equipment.userId !== req.userId,
    BAD_REQUEST,
    "You cannot rent your own equipment"
  );

  // Calculate total price based on the rental period
  const startDate = new Date(rentData.startDate);
  const endDate = new Date(rentData.endDate);

  // Ensure end date is after start date
  appAssert(
    endDate > startDate,
    BAD_REQUEST,
    "End date must be after start date"
  );

  // Calculate rental duration in days
  const rentalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)
  );

  // Calculate total price (daily rate * number of days)
  const totalPrice = equipment.price * rentalDays;

  // Create the equipment rental
  const rentEquipment = await prisma.equipmentRent.create({
    data: {
      equipmentId: rentData.equipmentId,
      renterId: req.userId,
      ownerId: equipment.userId,
      startDate,
      endDate,
      totalPrice,
      status: "PENDING",
    },
    select: {
      equipmentRentId: true,
      equipmentId: true,
      startDate: true,
      endDate: true,
      totalPrice: true,
      status: true,
    },
  });

  // Update equipment availability
  await prisma.equipment.update({
    where: { equipmentId: rentData.equipmentId },
    data: { isAvailable: false },
  });

  return res.status(CREATED).json(rentEquipment);
});

export const addEquipmentHandler = catchErrors(async (req, res) => {
  // Validate the request body against the schema
  const equipmentData = addEquipmentSchema.parse(req.body);

  // Create the new equipment entry
  const newEquipment = await prisma.equipment.create({
    data: {
      userId: req.userId, // Assuming authenticate middleware sets userId
      name: equipmentData.name,
      type: equipmentData.type,
      condition: equipmentData.condition,
      price: equipmentData.price,
      description: equipmentData.description || "",
      isAvailable: true,
    },
    select: {
      equipmentId: true,
      name: true,
      type: true,
      condition: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(CREATED).json(newEquipment);
});

export const getUserEquipmentHandler = catchErrors(async (req, res) => {
  // Retrieve all equipment owned by the user
  const userEquipment = await prisma.equipment.findMany({
    where: {
      userId: req.userId,
    },
    select: {
      equipmentId: true,
      name: true,
      type: true,
      condition: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(OK).json(userEquipment);
});

export const updateEquipmentHandler = catchErrors(async (req, res) => {
  // Extract equipment ID from params
  const { equipmentId } = req.params;

  // Validate the request body against the update schema
  const updateData = updateEquipmentSchema.parse(req.body);

  // First, verify that the equipment belongs to the logged-in user
  const existingEquipment = await prisma.equipment.findUnique({
    where: {
      equipmentId,
      userId: req.userId,
    },
  });

  // Ensure the equipment exists and belongs to the user
  appAssert(
    existingEquipment,
    BAD_REQUEST,
    "Equipment not found or you do not have permission to update it"
  );

  // Update the equipment
  const updatedEquipment = await prisma.equipment.update({
    where: { equipmentId },
    data: updateData,
    select: {
      equipmentId: true,
      name: true,
      type: true,
      condition: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(OK).json(updatedEquipment);
});

export const deleteEquipmentHandler = catchErrors(async (req, res) => {
  // Extract equipment ID from params
  const { equipmentId } = req.params;

  // First, verify that the equipment belongs to the logged-in user
  const existingEquipment = await prisma.equipment.findUnique({
    where: {
      equipmentId,
      userId: req.userId,
    },
  });

  // Ensure the equipment exists and belongs to the user
  appAssert(
    existingEquipment,
    BAD_REQUEST,
    "Equipment not found or you do not have permission to delete it"
  );

  // Check if the equipment is currently rented
  const activeRent = await prisma.equipmentRent.findFirst({
    where: {
      equipmentId,
      status: {
        not: "COMPLETED",
      },
    },
  });

  // Prevent deletion if there's an active rental
  appAssert(
    !activeRent,
    BAD_REQUEST,
    "Cannot delete equipment with an active rental"
  );

  // Delete the equipment
  await prisma.equipment.delete({
    where: { equipmentId },
  });

  return res.status(NO_CONTENT).send();
});
