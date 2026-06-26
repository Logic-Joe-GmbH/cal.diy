import { z } from "zod";

export const ZAdminListOrganizationMembersSchema = z.object({
  organizationId: z.number().int().positive(),
});

export type TAdminListOrganizationMembersSchema = z.infer<typeof ZAdminListOrganizationMembersSchema>;
