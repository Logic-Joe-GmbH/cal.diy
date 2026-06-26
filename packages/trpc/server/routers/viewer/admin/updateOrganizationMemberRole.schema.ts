import { z } from "zod";

export const ZAdminUpdateOrganizationMemberRoleSchema = z.object({
  organizationId: z.number().int().positive(),
  userId: z.number().int().positive(),
  role: z.enum(["MEMBER", "ADMIN", "OWNER"]),
});

export type TAdminUpdateOrganizationMemberRoleSchema = z.infer<
  typeof ZAdminUpdateOrganizationMemberRoleSchema
>;
