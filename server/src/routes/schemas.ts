import { z } from "zod";

export const contactMessageSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    phone: z.string().min(1).max(40).optional(),
    message: z.string().min(1).max(5000)
  })
  .strict();

export const hireRequestSchema = z
  .object({
    name: z.string().min(1).max(120),
    email: z.string().email().max(254),
    service: z.string().min(1).max(140),
    budget: z.string().min(1).max(80).optional(),
    details: z.string().min(1).max(8000).optional()
  })
  .strict();
