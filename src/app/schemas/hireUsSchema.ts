import { z } from "zod";

export const hireUsSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Please enter a valid email"),
  phone: z.string().trim().min(7, "Please enter a valid phone number"),
  company: z.string().trim().optional(),
  services: z.array(z.string()).min(1, "Select at least one service"),
  projectName: z.string().trim().min(2, "Please enter a project name"),
  projectDescription: z.string().trim().min(20, "Please describe your project"),
  serviceDetails: z.record(z.string(), z.string().trim()).optional(),
  deliveryDays: z.number().int().positive("Enter delivery days").max(365, "Too long"),
  clarification: z.string().trim().optional(),
  personalMessage: z.string().trim().optional(),
  referenceUrl: z.string().trim().optional(),
  additionalNotes: z.string().trim().optional(),
  companyWebsite: z.string().optional(),
});

export type HireUsFormValues = z.infer<typeof hireUsSchema>;
