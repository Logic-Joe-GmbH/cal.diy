import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminListOrganizationMembersSchema } from "./listOrganizationMembers.schema";

type ListOrganizationMembersOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminListOrganizationMembersSchema;
};

export const listOrganizationMembersHandler = async ({ input }: ListOrganizationMembersOptions) => {
  const { organizationId } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const members = await orgRepository.listMembers({ organizationId });

  return members.map((member) => ({
    userId: member.user.id,
    name: member.user.name,
    email: member.user.email,
    username: member.user.username,
    avatarUrl: member.user.avatarUrl,
    role: member.role,
    accepted: member.accepted,
  }));
};

export default listOrganizationMembersHandler;
