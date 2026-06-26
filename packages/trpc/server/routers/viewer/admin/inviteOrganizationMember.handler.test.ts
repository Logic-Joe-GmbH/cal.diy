import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindById = vi.fn();
const mockAddExistingUserAsMember = vi.fn();
const mockDeleteInviteTokens = vi.fn();
const mockCreateInviteToken = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindFirstOrganizationIdForUser = vi.fn();
const mockSendTeamInviteEmail = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findById = mockFindById;
    addExistingUserAsMember = mockAddExistingUserAsMember;
    deleteInviteTokens = mockDeleteInviteTokens;
    createInviteToken = mockCreateInviteToken;
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
vi.mock("@calcom/emails/organization-email-service", () => ({
  sendTeamInviteEmail: (...args: unknown[]) => mockSendTeamInviteEmail(...args),
}));
vi.mock("@calcom/i18n/server", () => ({
  getTranslation: () => Promise.resolve((key: string) => key),
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import inviteOrganizationMemberHandler from "./inviteOrganizationMember.handler";

const ctx = { user: { name: "Admin", email: "admin@acme.com", locale: "en" } as never };

describe("inviteOrganizationMemberHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({ id: 10, name: "Acme", slug: "acme", isOrganization: true });
    mockFindByEmail.mockResolvedValue(null);
    mockFindFirstOrganizationIdForUser.mockResolvedValue(null);
    mockAddExistingUserAsMember.mockResolvedValue({ profile: { id: 1 } });
    mockDeleteInviteTokens.mockResolvedValue(undefined);
    mockCreateInviteToken.mockResolvedValue({ id: 1 });
    mockSendTeamInviteEmail.mockResolvedValue(undefined);
  });

  it("adds an existing user directly and reports added", async () => {
    mockFindByEmail.mockResolvedValue({ id: 5, email: "member@acme.com", username: "member" });

    const result = await inviteOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, email: "member@acme.com", role: "ADMIN" },
    });

    expect(result).toEqual({ status: "added", email: "member@acme.com", role: "ADMIN", inviteLink: null });
    expect(mockAddExistingUserAsMember).toHaveBeenCalledTimes(1);
    expect(mockCreateInviteToken).not.toHaveBeenCalled();
  });

  it("rejects when the existing user is already in this organization", async () => {
    mockFindByEmail.mockResolvedValue({ id: 5, email: "member@acme.com", username: "member" });
    mockFindFirstOrganizationIdForUser.mockResolvedValue(10);

    await expect(
      inviteOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockAddExistingUserAsMember).not.toHaveBeenCalled();
  });

  it("rejects when the existing user belongs to another organization", async () => {
    mockFindByEmail.mockResolvedValue({ id: 5, email: "member@acme.com", username: "member" });
    mockFindFirstOrganizationIdForUser.mockResolvedValue(99);

    await expect(
      inviteOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "member@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("invites a new user with a token and returns an invite link", async () => {
    const result = await inviteOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, email: "new@acme.com", role: "MEMBER" },
    });

    expect(result.status).toBe("invited");
    expect(result.inviteLink).toContain("/signup?token=");
    expect(mockDeleteInviteTokens).toHaveBeenCalledWith({ organizationId: 10, email: "new@acme.com" });
    expect(mockCreateInviteToken).toHaveBeenCalledTimes(1);
    const tokenArg = mockCreateInviteToken.mock.calls[0][0];
    expect(tokenArg.organizationId).toBe(10);
    expect(tokenArg.email).toBe("new@acme.com");
    expect(typeof tokenArg.token).toBe("string");
    expect(tokenArg.expires).toBeInstanceOf(Date);
  });

  it("rejects when the organization is not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      inviteOrganizationMemberHandler({
        ctx,
        input: { organizationId: 10, email: "new@acme.com", role: "MEMBER" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockCreateInviteToken).not.toHaveBeenCalled();
  });

  it("still returns the invite link when email delivery fails", async () => {
    mockSendTeamInviteEmail.mockRejectedValue(new Error("SMTP not configured"));

    const result = await inviteOrganizationMemberHandler({
      ctx,
      input: { organizationId: 10, email: "new@acme.com", role: "MEMBER" },
    });

    expect(result.status).toBe("invited");
    expect(result.inviteLink).toContain("/signup?token=");
  });
});
