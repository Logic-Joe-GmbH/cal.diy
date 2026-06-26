import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminGetOrganizationSchema } from "./getOrganization.schema";

type GetOrganizationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminGetOrganizationSchema;
};

export const getOrganizationHandler = async ({ input }: GetOrganizationOptions) => {
  const { organizationId } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findByIdForSettings({ id: organizationId });
  if (!organization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    bio: organization.bio,
    logoUrl: organization.logoUrl,
    brandColor: organization.brandColor,
    bannerUrl: organization.bannerUrl,
    hideBranding: organization.hideBranding,
  };
};

export default getOrganizationHandler;
