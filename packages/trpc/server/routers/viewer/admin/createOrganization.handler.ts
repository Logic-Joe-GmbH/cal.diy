import { isNotACompanyEmail } from "@calcom/features/organizations/lib/isCompanyEmail";
import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { RESERVED_SUBDOMAINS } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminCreateOrganizationSchema } from "./createOrganization.schema";

const log = logger.getSubLogger({ prefix: ["admin/createOrganization"] });

type CreateOrganizationOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminCreateOrganizationSchema;
};

export const createOrganizationHandler = async ({ input }: CreateOrganizationOptions) => {
  const { name, slug, orgOwnerEmail } = input;

  if (RESERVED_SUBDOMAINS.includes(slug)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
  }

  const orgRepository = new OrganizationRepository(prisma);
  const existingOrgWithSlug = await orgRepository.findBySlug({ slug });
  if (existingOrgWithSlug) {
    throw new TRPCError({ code: "CONFLICT", message: "organization_url_taken" });
  }

  const userRepository = new UserRepository(prisma);
  const owner = await userRepository.findByEmail({ email: orgOwnerEmail });
  if (!owner) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No user found with email ${orgOwnerEmail}. The organization owner must be an existing user.`,
    });
  }

  const ownerExistingOrgId = await ProfileRepository.findFirstOrganizationIdForUser({ userId: owner.id });
  if (ownerExistingOrgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The designated owner already belongs to an organization.",
    });
  }

  // The auto-accept email domain lets future members signing up with the same domain
  // join the organization automatically. We only derive it from the owner's domain when
  // that's a company domain — never for personal providers (e.g. gmail.com), which would
  // otherwise auto-join every user of that provider into the organization.
  const autoAcceptEmail = isNotACompanyEmail(orgOwnerEmail) ? "" : orgOwnerEmail.split("@")[1];

  const { organization } = await orgRepository.createWithExistingUserAsOwner({
    orgData: {
      name,
      slug,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail,
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      logoUrl: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
      requestedSlug: slug,
    },
    owner: {
      id: owner.id,
      email: owner.email,
      nonOrgUsername: owner.username,
    },
  });

  log.info(`Admin created organization ${organization.id} (${slug}) with owner ${orgOwnerEmail}`);

  return {
    organizationId: organization.id,
    name: organization.name,
    slug: organization.slug,
  };
};

export default createOrganizationHandler;
