import { z } from "zod";

export const registerCompanySchema = z.object({
  companyName: z.string().min(1).max(255),
  industry: z.string().max(100).optional(),
  employeeCount: z.number().int().min(1).optional(),
  fullName: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});
