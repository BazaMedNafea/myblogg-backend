// RentLandController.ts

import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CREATED, BAD_REQUEST, OK, NO_CONTENT } from "../constants/http";
import catchErrors from "../utils/catchErrors";
import appAssert from "../utils/appAssert";

const prisma = new PrismaClient();

// Schema for renting land
const rentLandSchema = z.object({
  landId: z.string().min(1, "Land ID is required"),
  startDate: z.string().datetime({ message: "Invalid start date" }),
  endDate: z.string().datetime({ message: "Invalid end date" }),
});

// Schema for adding a land
const addLandSchema = z.object({
  location: z.string().min(1, "Location is required"),
  area: z.number().positive("Area must be a positive number"),
  soilType: z.string().min(1, "Soil type is required"),
  price: z.number().positive("Price must be a positive number"),
  description: z.string().optional(),
});

// Schema for updating a land
const updateLandSchema = z.object({
  location: z.string().min(1, "Location is required").optional(),
  area: z.number().positive("Area must be a positive number").optional(),
  soilType: z.string().min(1, "Soil type is required").optional(),
  price: z.number().positive("Price must be a positive number").optional(),
  description: z.string().optional(),
  isAvailable: z.boolean().optional(),
});

export const rentLandHandler = catchErrors(async (req, res) => {
  // Validate the request body against the schema
  const rentData = rentLandSchema.parse(req.body);

  // Retrieve the land to ensure it exists and is available
  const land = await prisma.land.findUnique({
    where: {
      landId: rentData.landId,
      isAvailable: true,
    },
  });

  // Check if land exists and is available
  appAssert(land, BAD_REQUEST, "Land not found or not available for rent");

  // Ensure the land is not owned by the current user
  appAssert(
    land.userId !== req.userId,
    BAD_REQUEST,
    "You cannot rent your own land"
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
  const totalPrice = land.price * rentalDays;

  // Create the land rental
  const rentLand = await prisma.rentLand.create({
    data: {
      landId: rentData.landId,
      renterId: req.userId,
      ownerId: land.userId,
      startDate,
      endDate,
      totalPrice,
      status: "PENDING",
    },
    select: {
      rentLandId: true,
      landId: true,
      startDate: true,
      endDate: true,
      totalPrice: true,
      status: true,
    },
  });

  // Update land availability
  await prisma.land.update({
    where: { landId: rentData.landId },
    data: { isAvailable: false },
  });

  return res.status(CREATED).json(rentLand);
});

export const addLandHandler = catchErrors(async (req, res) => {
  // Validate the request body against the schema
  const landData = addLandSchema.parse(req.body);

  // Create the new land entry
  const newLand = await prisma.land.create({
    data: {
      userId: req.userId, // Assuming authenticate middleware sets userId
      location: landData.location,
      area: landData.area,
      soilType: landData.soilType,
      price: landData.price,
      description: landData.description || "",
      isAvailable: true,
      type: "agricultural", // Default type, can be modified as needed
    },
    select: {
      landId: true,
      location: true,
      area: true,
      soilType: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(CREATED).json(newLand);
});

export const getUserLandsHandler = catchErrors(async (req, res) => {
  // Retrieve all lands owned by the user
  const userLands = await prisma.land.findMany({
    where: {
      userId: req.userId,
    },
    select: {
      landId: true,
      location: true,
      area: true,
      soilType: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(OK).json(userLands);
});

export const updateLandHandler = catchErrors(async (req, res) => {
  const { landId } = req.params;
  const updateData = updateLandSchema.parse(req.body);

  // First, verify that the land belongs to the user
  const existingLand = await prisma.land.findUnique({
    where: {
      landId,
      userId: req.userId,
    },
  });

  // Throw an error if the land doesn't exist or doesn't belong to the user
  appAssert(
    existingLand,
    BAD_REQUEST,
    "Land not found or you do not have permission to update this land"
  );

  // Update the land
  const updatedLand = await prisma.land.update({
    where: { landId },
    data: updateData,
    select: {
      landId: true,
      location: true,
      area: true,
      soilType: true,
      price: true,
      description: true,
      isAvailable: true,
    },
  });

  return res.status(OK).json(updatedLand);
});

export const deleteLandHandler = catchErrors(async (req, res) => {
  const { landId } = req.params;

  // First, verify that the land belongs to the user and has no active rentals
  const existingLand = await prisma.land.findUnique({
    where: {
      landId,
      userId: req.userId,
    },
    include: {
      rentLands: {
        where: {
          OR: [{ status: "PENDING" }, { status: "COMPLETED" }],
        },
      },
    },
  });

  // Throw an error if the land doesn't exist or doesn't belong to the user
  appAssert(
    existingLand,
    BAD_REQUEST,
    "Land not found or you do not have permission to delete this land"
  );

  // Check if there are any active rentals
  appAssert(
    existingLand.rentLands.length === 0,
    BAD_REQUEST,
    "Cannot delete land with active or completed rental agreements"
  );

  // Delete the land
  await prisma.land.delete({
    where: { landId },
  });

  return res.status(NO_CONTENT).send();
});
