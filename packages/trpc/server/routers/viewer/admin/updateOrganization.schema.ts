import { z } from "zod";

const emptyToNull = z
  .string()
  .trim()
  .transform((value) => (value.length === 0 ? null : value));

export const ZAdminUpdateOrganizationSchema = z.object({
  organizationId: z.number().int().positive(),
  name: z.string().trim().min(1).optional(),
  bio: emptyToNull.nullish(),
  logoUrl: emptyToNull.nullish(),
  brandColor: emptyToNull.nullish(),
  bannerUrl: emptyToNull.nullish(),
  hideBranding: z.boolean().optional(),
});

export type TAdminUpdateOrganizationSchema = z.infer<typeof ZAdminUpdateOrganizationSchema>;
