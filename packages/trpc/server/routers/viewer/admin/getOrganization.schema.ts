import { z } from "zod";

export const ZAdminGetOrganizationSchema = z.object({
  organizationId: z.number().int().positive(),
});

export type TAdminGetOrganizationSchema = z.infer<typeof ZAdminGetOrganizationSchema>;
