import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindById = vi.fn();
const mockFindMembership = vi.fn();
const mockCountOwners = vi.fn();
const mockRemoveMember = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findById = mockFindById;
    findMembership = mockFindMembership;
    countOwners = mockCountOwners;
    removeMember = mockRemoveMember;
  },
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import removeOrganizationMemberHandler from "./removeOrganizationMember.handler";

const ctx = { user: {} as never };

describe("removeOrganizationMemberHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({ id: 10, isOrganization: true });
    mockFindMembership.mockResolvedValue({ role: MembershipRole.MEMBER, userId: 5 });
    mockCountOwners.mockResolvedValue(2);
    mockRemoveMember.mockResolvedValue(undefined);
  });

  it("removes a member", async () => {
    const result = await removeOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, userId: 5 },
    });

    expect(result).toEqual({ organizationId: 10, userId: 5 });
    expect(mockRemoveMember).toHaveBeenCalledWith({ organizationId: 10, userId: 5 });
  });

  it("rejects when the organization is not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      removeOrganizationMemberHandler({ ctx, input: { organizationId: 10, userId: 5 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  it("rejects when the user is not a member", async () => {
    mockFindMembership.mockResolvedValue(null);

    await expect(
      removeOrganizationMemberHandler({ ctx, input: { organizationId: 10, userId: 5 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  it("rejects removing the last owner", async () => {
    mockFindMembership.mockResolvedValue({ role: MembershipRole.OWNER, userId: 5 });
    mockCountOwners.mockResolvedValue(1);

    await expect(
      removeOrganizationMemberHandler({ ctx, input: { organizationId: 10, userId: 5 } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockRemoveMember).not.toHaveBeenCalled();
  });

  it("allows removing an owner when another owner exists", async () => {
    mockFindMembership.mockResolvedValue({ role: MembershipRole.OWNER, userId: 5 });
    mockCountOwners.mockResolvedValue(2);

    await removeOrganizationMemberHandler({ ctx, input: { organizationId: 10, userId: 5 } });

    expect(mockRemoveMember).toHaveBeenCalledWith({ organizationId: 10, userId: 5 });
  });
});
