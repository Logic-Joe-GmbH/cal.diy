import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindById = vi.fn();
const mockFindMembership = vi.fn();
const mockCountOwners = vi.fn();
const mockUpdateMemberRole = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findById = mockFindById;
    findMembership = mockFindMembership;
    countOwners = mockCountOwners;
    updateMemberRole = mockUpdateMemberRole;
  },
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import updateOrganizationMemberRoleHandler from "./updateOrganizationMemberRole.handler";

const ctx = { user: {} as never };

describe("updateOrganizationMemberRoleHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({ id: 10, isOrganization: true });
    mockFindMembership.mockResolvedValue({ role: MembershipRole.MEMBER, userId: 5 });
    mockCountOwners.mockResolvedValue(2);
    mockUpdateMemberRole.mockResolvedValue(undefined);
  });

  it("changes a member's role", async () => {
    const result = await updateOrganizationMemberRoleHandler({
      ctx,
      input: { organizationId: 10, userId: 5, role: "ADMIN" },
    });

    expect(result).toEqual({ organizationId: 10, userId: 5, role: "ADMIN" });
    expect(mockUpdateMemberRole).toHaveBeenCalledWith({
      organizationId: 10,
      userId: 5,
      role: MembershipRole.ADMIN,
    });
  });

  it("rejects when the organization is not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      updateOrganizationMemberRoleHandler({ ctx, input: { organizationId: 10, userId: 5, role: "ADMIN" } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockUpdateMemberRole).not.toHaveBeenCalled();
  });

  it("rejects when the user is not a member", async () => {
    mockFindMembership.mockResolvedValue(null);

    await expect(
      updateOrganizationMemberRoleHandler({ ctx, input: { organizationId: 10, userId: 5, role: "ADMIN" } })
    ).rejects.toThrowError(TRPCError);
    expect(mockUpdateMemberRole).not.toHaveBeenCalled();
  });

  it("rejects demoting the last owner", async () => {
    mockFindMembership.mockResolvedValue({ role: MembershipRole.OWNER, userId: 5 });
    mockCountOwners.mockResolvedValue(1);

    await expect(
      updateOrganizationMemberRoleHandler({ ctx, input: { organizationId: 10, userId: 5, role: "MEMBER" } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockUpdateMemberRole).not.toHaveBeenCalled();
  });

  it("allows demoting an owner when another owner exists", async () => {
    mockFindMembership.mockResolvedValue({ role: MembershipRole.OWNER, userId: 5 });
    mockCountOwners.mockResolvedValue(2);

    await updateOrganizationMemberRoleHandler({
      ctx,
      input: { organizationId: 10, userId: 5, role: "MEMBER" },
    });

    expect(mockUpdateMemberRole).toHaveBeenCalledWith({
      organizationId: 10,
      userId: 5,
      role: MembershipRole.MEMBER,
    });
  });
});
