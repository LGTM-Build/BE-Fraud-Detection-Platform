import { z } from "zod";

export const createUserSchema = z.object({
  employeeId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(1).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  role: z.enum([
    "super_admin",
    "super_user",
    "auditor",
    "operator",
    "department_head",
  ]),
});

export const updateUserSchema = z.object({
  employeeId: z.string().uuid().nullable().optional(),
  fullName: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  role: z
    .enum([
      "super_admin",
      "super_user",
      "auditor",
      "operator",
      "department_head",
    ])
    .optional(),
});
