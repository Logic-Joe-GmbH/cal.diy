import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdateOrganizationSchema } from "./updateOrganization.schema";

const log = logger.getSubLogger({ prefix: ["admin/updateOrganization"] });

type UpdateOrganizationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateOrganizationSchema;
};

export const updateOrganizationHandler = async ({ input }: UpdateOrganizationOptions) => {
  const { organizationId, ...rest } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  // Only forward keys the caller actually sent so unspecified fields keep their value.
  const data: Parameters<typeof orgRepository.updateSettings>[0]["data"] = {};
  if (rest.name !== undefined) data.name = rest.name;
  if (rest.bio !== undefined) data.bio = rest.bio;
  if (rest.logoUrl !== undefined) data.logoUrl = rest.logoUrl;
  if (rest.brandColor !== undefined) data.brandColor = rest.brandColor;
  if (rest.bannerUrl !== undefined) data.bannerUrl = rest.bannerUrl;
  if (rest.hideBranding !== undefined) data.hideBranding = rest.hideBranding;

  const updated = await orgRepository.updateSettings({ organizationId, data });

  log.info(`Admin updated settings for organization ${organizationId}`);

  return updated;
};

export default updateOrganizationHandler;
