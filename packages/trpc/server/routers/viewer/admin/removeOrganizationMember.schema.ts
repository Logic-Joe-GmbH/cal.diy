import { z } from "zod";

export const ZAdminRemoveOrganizationMemberSchema = z.object({
  organizationId: z.number().int().positive(),
  userId: z.number().int().positive(),
});

export type TAdminRemoveOrganizationMemberSchema = z.infer<typeof ZAdminRemoveOrganizationMemberSchema>;
