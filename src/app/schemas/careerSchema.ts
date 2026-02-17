import { z } from "zod";

export const careerSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().min(8, "Please enter a valid phone number"),
  role: z.string().min(2, "Please enter the role you’re applying for"),
  experience: z.string().optional(),
  linkedinUrl: z
    .string()
    .min(1, "LinkedIn link is required")
    .refine((v) => /^https?:\/\//i.test(v), "LinkedIn link must start with http(s)://"),
  portfolioUrl: z
    .string()
    .optional()
    .refine((v) => !v || /^https?:\/\//i.test(v), "Portfolio URL must start with http(s)://"),
  whyHireYou: z.string().min(10, "Please tell us why we should hire you"),
  resumeFile: z
    .any()
    .refine((v) => {
      const len = typeof v === "object" && v && "length" in (v as any) ? Number((v as any).length) : 0;
      return Number.isFinite(len) && len > 0;
    }, "Resume is required"),
  message: z.string().optional(),
  companyWebsite: z.string().optional(),
});

export type CareerFormValues = z.infer<typeof careerSchema>;
