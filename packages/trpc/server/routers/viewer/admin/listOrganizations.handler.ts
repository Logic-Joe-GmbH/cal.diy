import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { prisma } from "@calcom/prisma";

export const listOrganizationsHandler = async () => {
  const orgRepository = new OrganizationRepository(prisma);
  const organizations = await orgRepository.findManyForAdmin();

  return organizations.map((org) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    logoUrl: org.logoUrl,
    memberCount: org._count.members,
    createdAt: org.createdAt.toISOString(),
  }));
};

export default listOrganizationsHandler;
