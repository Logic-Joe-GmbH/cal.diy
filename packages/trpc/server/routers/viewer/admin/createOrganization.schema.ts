import slugify from "@calcom/lib/slugify";
import { z } from "zod";

export const ZAdminCreateOrganizationSchema = z.object({
  name: z.string().trim().min(1),
  slug: z
    .string()
    .trim()
    .min(1)
    .transform((val) => slugify(val)),
  orgOwnerEmail: z.string().email().toLowerCase(),
});

export type TAdminCreateOrganizationSchema = z.infer<typeof ZAdminCreateOrganizationSchema>;
