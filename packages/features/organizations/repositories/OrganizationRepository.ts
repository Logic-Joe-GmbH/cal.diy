import { createAProfileForAnExistingUser } from "@calcom/features/profile/lib/createAProfileForAnExistingUser";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import type { PrismaClient } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";

const log = logger.getSubLogger({ prefix: ["OrganizationRepository"] });

const orgSelect = {
  id: true,
  name: true,
  slug: true,
  logoUrl: true,
};

type CreateOrgData = {
  name: string;
  slug: string | null;
  isOrganizationConfigured: boolean;
  isOrganizationAdminReviewed: boolean;
  autoAcceptEmail: string;
  seats: number | null;
  pricePerSeat: number | null;
  isPlatform: boolean;
  billingPeriod?: "MONTHLY" | "ANNUALLY";
  logoUrl: string | null;
  bio: string | null;
  brandColor: string | null;
  bannerUrl: string | null;
  requestedSlug?: string | null;
};

export class OrganizationRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(orgData: CreateOrgData) {
    return this.prismaClient.team.create({
      data: {
        name: orgData.name,
        isOrganization: true,
        slug: orgData.slug,
        logoUrl: orgData.logoUrl,
        bio: orgData.bio,
        brandColor: orgData.brandColor,
        bannerUrl: orgData.bannerUrl,
        organizationSettings: {
          create: {
            isAdminReviewed: orgData.isOrganizationAdminReviewed,
            isOrganizationVerified: true,
            isOrganizationConfigured: orgData.isOrganizationConfigured,
            orgAutoAcceptEmail: orgData.autoAcceptEmail,
          },
        },
        metadata: {
          isPlatform: orgData.isPlatform,
          requestedSlug: orgData.requestedSlug ?? null,
          orgSeats: orgData.seats,
          orgPricePerSeat: orgData.pricePerSeat,
          billingPeriod: orgData.billingPeriod ?? null,
        },
        isPlatform: orgData.isPlatform,
      },
    });
  }

  async createWithExistingUserAsOwner({
    orgData,
    owner,
  }: {
    orgData: CreateOrgData;
    owner: { id: number; email: string; nonOrgUsername: string | null };
  }) {
    log.debug("createWithExistingUserAsOwner", safeStringify({ orgData, owner }));
    const organization = await this.create(orgData);
    const { profile: ownerProfile } = await this.addExistingUserAsMember({
      organizationId: organization.id,
      user: owner,
      role: MembershipRole.OWNER,
    });
    return { organization, ownerProfile };
  }

  async addExistingUserAsMember({
    organizationId,
    user,
    role,
  }: {
    organizationId: number;
    user: { id: number; email: string; nonOrgUsername: string | null };
    role: MembershipRole;
  }) {
    const profile = await createAProfileForAnExistingUser({
      user: {
        id: user.id,
        email: user.email,
        currentUsername: user.nonOrgUsername,
      },
      organizationId,
    });

    await this.prismaClient.membership.create({
      data: {
        createdAt: new Date(),
        userId: user.id,
        role,
        accepted: true,
        teamId: organizationId,
      },
    });
    return { profile };
  }

  async findById({ id }: { id: number }) {
    return this.prismaClient.team.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        slug: true,
        isOrganization: true,
      },
    });
  }

  async findBySlug({ slug }: { slug: string }) {
    return this.prismaClient.team.findFirst({
      where: {
        slug,
        parentId: null,
      },
      select: orgSelect,
    });
  }

  async findManyForAdmin() {
    return this.prismaClient.team.findMany({
      where: { isOrganization: true },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
        _count: {
          select: { members: true },
        },
      },
      orderBy: { id: "desc" },
    });
  }

  async findByIdForSettings({ id }: { id: number }) {
    return this.prismaClient.team.findFirst({
      where: { id, isOrganization: true },
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        logoUrl: true,
        brandColor: true,
        bannerUrl: true,
        hideBranding: true,
      },
    });
  }

  async updateSettings({
    organizationId,
    data,
  }: {
    organizationId: number;
    data: {
      name?: string;
      bio?: string | null;
      logoUrl?: string | null;
      brandColor?: string | null;
      bannerUrl?: string | null;
      hideBranding?: boolean;
    };
  }) {
    return this.prismaClient.team.update({
      where: { id: organizationId },
      data,
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        logoUrl: true,
        brandColor: true,
        bannerUrl: true,
        hideBranding: true,
      },
    });
  }

  async listMembers({ organizationId }: { organizationId: number }) {
    return this.prismaClient.membership.findMany({
      where: { teamId: organizationId },
      select: {
        role: true,
        accepted: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { id: "asc" },
    });
  }

  async findMembership({ organizationId, userId }: { organizationId: number; userId: number }) {
    return this.prismaClient.membership.findFirst({
      where: { teamId: organizationId, userId },
      select: { role: true, userId: true },
    });
  }

  async countOwners({ organizationId }: { organizationId: number }) {
    return this.prismaClient.membership.count({
      where: { teamId: organizationId, role: MembershipRole.OWNER },
    });
  }

  async updateMemberRole({
    organizationId,
    userId,
    role,
  }: {
    organizationId: number;
    userId: number;
    role: MembershipRole;
  }) {
    await this.prismaClient.membership.updateMany({
      where: { teamId: organizationId, userId },
      data: { role },
    });
  }

  async removeMember({ organizationId, userId }: { organizationId: number; userId: number }) {
    // The org profile holds movedToProfileId via a SetNull relation, so deleting the
    // profile automatically clears the user's movedToProfileId pointer.
    await this.prismaClient.membership.deleteMany({
      where: { teamId: organizationId, userId },
    });
    await this.prismaClient.profile.deleteMany({
      where: { userId, organizationId },
    });
  }

  async deleteInviteTokens({ organizationId, email }: { organizationId: number; email: string }) {
    await this.prismaClient.verificationToken.deleteMany({
      where: { teamId: organizationId, identifier: email },
    });
  }

  async createInviteToken({
    organizationId,
    email,
    token,
    expires,
  }: {
    organizationId: number;
    email: string;
    token: string;
    expires: Date;
  }) {
    return this.prismaClient.verificationToken.create({
      data: {
        identifier: email,
        token,
        expires,
        teamId: organizationId,
      },
    });
  }
}
