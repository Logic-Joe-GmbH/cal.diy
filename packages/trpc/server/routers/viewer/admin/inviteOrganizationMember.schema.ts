import { z } from "zod";

export const ZAdminInviteOrganizationMemberSchema = z.object({
  organizationId: z.number().int().positive(),
  email: z.string().email().toLowerCase(),
  role: z.enum(["MEMBER", "ADMIN"]).default("MEMBER"),
});

export type TAdminInviteOrganizationMemberSchema = z.infer<typeof ZAdminInviteOrganizationMemberSchema>;
