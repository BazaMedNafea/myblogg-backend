//AuthSchemas.ts

import { z } from "zod";

export const emailSchema = z.string().email().min(1).max(255);

const passwordSchema = z.string().min(6).max(255);

// Telephone number validation
export const telephoneSchema = z
  .string()
  .refine((value) => /^(0[567]\d{8}|\+213[567]\d{8})$/.test(value), {
    message:
      "Invalid phone number. Must start with 06, 07, 05, or +213 followed by 8 digits",
  });

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  userAgent: z.string().optional(),
});

export const registerSchema = loginSchema
  .extend({
    name: z.string().min(2).max(100),
    telephone: telephoneSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const verificationCodeSchema = z.string().min(1).max(25);

export const resetPasswordSchema = z.object({
  password: passwordSchema,
  verificationCode: verificationCodeSchema,
});
