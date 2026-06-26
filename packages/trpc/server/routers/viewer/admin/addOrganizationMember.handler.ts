import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminAddOrganizationMemberSchema } from "./addOrganizationMember.schema";

const log = logger.getSubLogger({ prefix: ["admin/addOrganizationMember"] });

type AddOrganizationMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminAddOrganizationMemberSchema;
};

export const addOrganizationMemberHandler = async ({ input }: AddOrganizationMemberOptions) => {
  const { organizationId, email, role } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const userRepository = new UserRepository(prisma);
  const user = await userRepository.findByEmail({ email });
  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No user found with email ${email}. The member must be an existing user.`,
    });
  }

  const existingOrgId = await ProfileRepository.findFirstOrganizationIdForUser({ userId: user.id });
  if (existingOrgId === organizationId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This user is already a member of the organization.",
    });
  }
  if (existingOrgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "This user already belongs to another organization.",
    });
  }

  await orgRepository.addExistingUserAsMember({
    organizationId,
    user: { id: user.id, email: user.email, nonOrgUsername: user.username },
    role: role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER,
  });

  log.info(`Admin added user ${email} to organization ${organizationId} as ${role}`);

  return { organizationId, email, role };
};

export default addOrganizationMemberHandler;
