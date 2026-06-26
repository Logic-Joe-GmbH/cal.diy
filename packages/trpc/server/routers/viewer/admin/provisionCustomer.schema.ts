import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZAdminProvisionCustomerSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .transform((val) => slugify(val)),
  orgOwnerEmail: z.string().email().toLowerCase(),
  eventTitle: z.string().trim().min(1).default("30 Minute Meeting"),
  eventLength: z.number().int().positive().max(720).default(30),
});

export type TAdminProvisionCustomerSchema = z.infer<typeof ZAdminProvisionCustomerSchema>;
