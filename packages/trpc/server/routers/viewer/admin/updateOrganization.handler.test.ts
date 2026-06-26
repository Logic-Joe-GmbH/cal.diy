import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindById = vi.fn();
const mockUpdateSettings = vi.fn();

vi.mock("@calcom/features/organizations/repositories/OrganizationRepository", () => ({
  OrganizationRepository: class {
    findById = mockFindById;
    updateSettings = mockUpdateSettings;
  },
}));
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import updateOrganizationHandler from "./updateOrganization.handler";

const ctx = { user: {} as never };

describe("updateOrganizationHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindById.mockResolvedValue({ id: 10, isOrganization: true });
    mockUpdateSettings.mockResolvedValue({ id: 10, name: "Acme" });
  });

  it("updates the provided settings", async () => {
    await updateOrganizationHandler({
      ctx,
      input: { organizationId: 10, name: "Acme", brandColor: "#ff0000", hideBranding: true },
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      organizationId: 10,
      data: { name: "Acme", brandColor: "#ff0000", hideBranding: true },
    });
  });

  it("only forwards keys that were sent", async () => {
    await updateOrganizationHandler({
      ctx,
      input: { organizationId: 10, bio: "Hello" },
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      organizationId: 10,
      data: { bio: "Hello" },
    });
  });

  it("forwards null to clear a nullable field", async () => {
    await updateOrganizationHandler({
      ctx,
      input: { organizationId: 10, logoUrl: null },
    });

    expect(mockUpdateSettings).toHaveBeenCalledWith({
      organizationId: 10,
      data: { logoUrl: null },
    });
  });

  it("rejects when the organization is not found", async () => {
    mockFindById.mockResolvedValue(null);

    await expect(
      updateOrganizationHandler({ ctx, input: { organizationId: 10, name: "Acme" } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(mockUpdateSettings).not.toHaveBeenCalled();
  });
});
