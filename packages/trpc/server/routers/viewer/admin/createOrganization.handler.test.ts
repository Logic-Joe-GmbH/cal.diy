import { TRPCError } from "@trpc/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindBySlug = vi.fn();
const mockCreateWithExistingUserAsOwner = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindFirstOrganizationIdForUser = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findBySlug = mockFindBySlug;
    createWithExistingUserAsOwner = mockCreateWithExistingUserAsOwner;
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
vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return { ...actual, RESERVED_SUBDOMAINS: ["reserved"] };
});
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import createOrganizationHandler from "./createOrganization.handler";

const ctx = { user: {} as never };

describe("createOrganizationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindBySlug.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue({ id: 5, email: "owner@acme.com", username: "owner" });
    mockFindFirstOrganizationIdForUser.mockResolvedValue(null);
    mockCreateWithExistingUserAsOwner.mockResolvedValue({
      organization: { id: 10, name: "Acme", slug: "acme" },
    });
  });

  it("creates an organization with the existing user as owner", async () => {
    const result = await createOrganizationHandler({
      ctx,
      input: { name: "Acme", slug: "acme", orgOwnerEmail: "owner@acme.com" },
    });

    expect(result).toEqual({ organizationId: 10, name: "Acme", slug: "acme" });
    expect(mockCreateWithExistingUserAsOwner).toHaveBeenCalledTimes(1);
    const callArg = mockCreateWithExistingUserAsOwner.mock.calls[0][0];
    expect(callArg.orgData.autoAcceptEmail).toBe("acme.com");
    expect(callArg.orgData.slug).toBe("acme");
    expect(callArg.owner).toEqual({ id: 5, email: "owner@acme.com", nonOrgUsername: "owner" });
  });

  it("does not set an auto-accept domain for personal email providers", async () => {
    await createOrganizationHandler({
      ctx,
      input: { name: "Acme", slug: "acme", orgOwnerEmail: "founder@gmail.com" },
    });

    const callArg = mockCreateWithExistingUserAsOwner.mock.calls[0][0];
    expect(callArg.orgData.autoAcceptEmail).toBe("");
  });

  it("rejects a reserved slug before touching the database", async () => {
    await expect(
      createOrganizationHandler({
        ctx,
        input: { name: "Reserved", slug: "reserved", orgOwnerEmail: "owner@acme.com" },
      })
    ).rejects.toThrowError(TRPCError);
    expect(mockFindBySlug).not.toHaveBeenCalled();
  });

  it("rejects a slug already taken by another team or organization", async () => {
    mockFindBySlug.mockResolvedValue({ id: 1, name: "Existing", slug: "acme", logoUrl: null });

    await expect(
      createOrganizationHandler({
        ctx,
        input: { name: "Acme", slug: "acme", orgOwnerEmail: "owner@acme.com" },
      })
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(mockCreateWithExistingUserAsOwner).not.toHaveBeenCalled();
  });

  it("rejects when no user exists for the owner email", async () => {
    mockFindByEmail.mockResolvedValue(null);

    await expect(
      createOrganizationHandler({
        ctx,
        input: { name: "Acme", slug: "acme", orgOwnerEmail: "ghost@acme.com" },
      })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockCreateWithExistingUserAsOwner).not.toHaveBeenCalled();
  });

  it("rejects when the owner already belongs to an organization", async () => {
    mockFindFirstOrganizationIdForUser.mockResolvedValue(42);

    await expect(
      createOrganizationHandler({
        ctx,
        input: { name: "Acme", slug: "acme", orgOwnerEmail: "owner@acme.com" },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockCreateWithExistingUserAsOwner).not.toHaveBeenCalled();
  });
});
