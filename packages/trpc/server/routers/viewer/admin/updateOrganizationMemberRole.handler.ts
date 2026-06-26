import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminUpdateOrganizationMemberRoleSchema } from "./updateOrganizationMemberRole.schema";

const log = logger.getSubLogger({ prefix: ["admin/updateOrganizationMemberRole"] });

type UpdateOrganizationMemberRoleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminUpdateOrganizationMemberRoleSchema;
};

export const updateOrganizationMemberRoleHandler = async ({ input }: UpdateOrganizationMemberRoleOptions) => {
  const { organizationId, userId, role } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const membership = await orgRepository.findMembership({ organizationId, userId });
  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This user is not a member of the organization." });
  }

  // Prevent demoting the last owner — an organization must always retain at least one owner.
  if (membership.role === MembershipRole.OWNER && role !== "OWNER") {
    const ownerCount = await orgRepository.countOwners({ organizationId });
    if (ownerCount <= 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot change the role of the last owner of the organization.",
      });
    }
  }

  await orgRepository.updateMemberRole({ organizationId, userId, role: MembershipRole[role] });

  log.info(`Admin changed role of user ${userId} in organization ${organizationId} to ${role}`);

  return { organizationId, userId, role };
};

export default updateOrganizationMemberRoleHandler;
