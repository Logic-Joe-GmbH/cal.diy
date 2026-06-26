import { MembershipRole } from "@calcom/prisma/enums";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindById = vi.fn();
const mockAddExistingUserAsMember = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindFirstOrganizationIdForUser = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findById = mockFindById;
    addExistingUserAsMember = mockAddExistingUserAsMember;
  },
}));
vi.mock("@calcom/features/users/repositories/UserRepository", () => ({
  UserRepository: class {
    findByEmail = mockFindByEmail;
  },
}));
vi.mock("@calcom/features/profile/repositories/ProfileRepository", () => ({
  ProfileRepository: {
    findFirstOrganizationIdForUser: (...args: unknown[]) => mockFindFirstOrganizationIdForUser(...args),
  },
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import addOrganizationMemberHandler from "./addOrganizationMember.handler";

const ctx = { user: {} as never };

describe("addOrganizationMemberHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({ id: 10, name: "Acme", slug: "acme", isOrganization: true });
    mockFindByEmail.mockResolvedValue({ id: 7, email: "member@acme.com", username: "member" });
    mockFindFirstOrganizationIdForUser.mockResolvedValue(null);
    mockAddExistingUserAsMember.mockResolvedValue({ profile: { id: 1 } });
  });

  it("adds an existing user as a member", async () => {
    const result = await addOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
    });

    expect(result).toEqual({ organizationId: 10, email: "member@acme.com", role: "MEMBER" });
    expect(mockAddExistingUserAsMember).toHaveBeenCalledWith({
      organizationId: 10,
      user: { id: 7, email: "member@acme.com", nonOrgUsername: "member" },
      role: MembershipRole.MEMBER,
    });
  });

  it("maps the ADMIN role to MembershipRole.ADMIN", async () => {
    await addOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, email: "member@acme.com", role: "ADMIN" },
    });

    expect(mockAddExistingUserAsMember).toHaveBeenCalledWith(
      expect.objectContaining({ role: MembershipRole.ADMIN })
    );
  });

  it("rejects when the organization does not exist", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      addOrganizationMemberHandler({
        ctx,
        input: { organizationId: 999, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockAddExistingUserAsMember).not.toHaveBeenCalled();
  });

  it("rejects when the target id is a team, not an organization", async () => {
    mockFindById.mockResolvedValue({ id: 10, name: "Team", slug: "team", isOrganization: false });

    await expect(
      addOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects when the user does not exist", async () => {
    mockFindByEmail.mockResolvedValue(null);

    await expect(
      addOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "ghost@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockAddExistingUserAsMember).not.toHaveBeenCalled();
  });

  it("rejects when the user is already in this organization", async () => {
    mockFindFirstOrganizationIdForUser.mockResolvedValue(10);

    await expect(
      addOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockAddExistingUserAsMember).not.toHaveBeenCalled();
  });

  it("rejects when the user belongs to another organization", async () => {
    mockFindFirstOrganizationIdForUser.mockResolvedValue(42);

    await expect(
      addOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockAddExistingUserAsMember).not.toHaveBeenCalled();
  });
});
