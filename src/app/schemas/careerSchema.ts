import { z } from "zod";

export const careerSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  role: z.string().min(2, "Please enter the role you’re applying for"),
  experience: z.string().optional(),
  portfolioUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Portfolio URL must start with http(s)://"),
  resumeFile: z.any().optional(),
  message: z.string().optional(),
  companyWebsite: z.string().optional(),
});

export type CareerFormValues = z.infer<typeof careerSchema>;
