import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminRemoveOrganizationMemberSchema } from "./removeOrganizationMember.schema";

const log = logger.getSubLogger({ prefix: ["admin/removeOrganizationMember"] });

type RemoveOrganizationMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminRemoveOrganizationMemberSchema;
};

export const removeOrganizationMemberHandler = async ({ input }: RemoveOrganizationMemberOptions) => {
  const { organizationId, userId } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const membership = await orgRepository.findMembership({ organizationId, userId });
  if (!membership) {
    throw new TRPCError({ code: "NOT_FOUND", message: "This user is not a member of the organization." });
  }

  // Prevent removing the last owner — an organization must always retain at least one owner.
  if (membership.role === MembershipRole.OWNER) {
    const ownerCount = await orgRepository.countOwners({ organizationId });
    if (ownerCount <= 1) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cannot remove the last owner of the organization.",
      });
    }
  }

  await orgRepository.removeMember({ organizationId, userId });

  log.info(`Admin removed user ${userId} from organization ${organizationId}`);

  return { organizationId, userId };
};

export default removeOrganizationMemberHandler;
