import { z } from "zod";

export const ZAdminAddOrganizationMemberSchema = z.object({
  organizationId: z.number().int().positive(),
  email: z.string().email().toLowerCase(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export type TAdminAddOrganizationMemberSchema = z.infer<typeof ZAdminAddOrganizationMemberSchema>;
