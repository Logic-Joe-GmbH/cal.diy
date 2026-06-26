import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFindBySlug = vi.fn();
const mockCreateWithExistingUserAsOwner = vi.fn();
const mockFindByEmail = vi.fn();
const mockFindFirstOrganizationIdForUser = vi.fn();
const mockGetDefaultScheduleId = vi.fn();
const mockCreateDefaultSchedule = vi.fn();
const mockEventTypeCreate = vi.fn();

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
vi.mock("@calcom/features/schedules/repositories/ScheduleRepository", () => ({
  ScheduleRepository: class {
    getDefaultScheduleId = mockGetDefaultScheduleId;
    createDefaultSchedule = mockCreateDefaultSchedule;
  },
}));
vi.mock("@calcom/features/eventtypes/repositories/eventTypeRepository", () => ({
  EventTypeRepository: class {
    create = mockEventTypeCreate;
  },
}));
vi.mock("@calcom/features/auth/signup/utils/getOrgUsernameFromEmail", () => ({
  getOrgUsernameFromEmail: () => "owner",
}));
vi.mock("@calcom/lib/server/getServerErrorFromUnknown", () => ({
  isPrismaError: (e: unknown) => typeof e === "object" && e !== null && "code" in e,
}));
vi.mock("@calcom/lib/constants", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@calcom/lib/constants")>();
  return { ...actual, RESERVED_SUBDOMAINS: ["reserved"] };
});
vi.mock("@calcom/prisma", () => {
  const mockPrisma = {};
  return { default: mockPrisma, prisma: mockPrisma };
});

import provisionCustomerHandler from "./provisionCustomer.handler";

const ctx = { user: {} as never };
const baseInput = {
  name: "Acme",
  slug: "acme",
  orgOwnerEmail: "owner@acme.com",
  eventTitle: "30 Minute Meeting",
  eventLength: 30,
};

describe("provisionCustomerHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindBySlug.mockResolvedValue(null);
    mockFindByEmail.mockResolvedValue({ id: 5, email: "owner@acme.com", username: "owner" });
    mockFindFirstOrganizationIdForUser.mockResolvedValue(null);
    mockCreateWithExistingUserAsOwner.mockResolvedValue({ organization: { id: 10, slug: "acme" } });
    mockGetDefaultScheduleId.mockResolvedValue(7);
    mockCreateDefaultSchedule.mockResolvedValue({ id: 8 });
    mockEventTypeCreate.mockResolvedValue({ id: 1 });
  });

  it("provisions org, event type and returns booking info", async () => {
    const result = await provisionCustomerHandler({ ctx, input: baseInput });

    expect(result.organizationId).toBe(10);
    expect(result.eventSlug).toBe("30-minute-meeting");
    expect(result.bookingPath).toBe("org/acme/owner/30-minute-meeting");
    expect(result.bookingUrl).toContain("org/acme/owner/30-minute-meeting");
    expect(mockEventTypeCreate).toHaveBeenCalledTimes(1);
    const eventArg = mockEventTypeCreate.mock.calls[0][0];
    expect(eventArg).toMatchObject({ userId: 5, length: 30, scheduleId: 7, slug: "30-minute-meeting" });
  });

  it("rejects a reserved slug", async () => {
    await expect(
      provisionCustomerHandler({ ctx, input: { ...baseInput, slug: "reserved" } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockCreateWithExistingUserAsOwner).not.toHaveBeenCalled();
  });

  it("rejects when the owner does not exist", async () => {
    mockFindByEmail.mockResolvedValue(null);
    await expect(provisionCustomerHandler({ ctx, input: baseInput })).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("rejects when the owner already belongs to an organization", async () => {
    mockFindFirstOrganizationIdForUser.mockResolvedValue(42);
    await expect(provisionCustomerHandler({ ctx, input: baseInput })).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("creates a default schedule when the owner has none", async () => {
    mockGetDefaultScheduleId.mockRejectedValue(new Error("No schedules found for user"));

    await provisionCustomerHandler({ ctx, input: baseInput });

    expect(mockCreateDefaultSchedule).toHaveBeenCalledTimes(1);
    const eventArg = mockEventTypeCreate.mock.calls[0][0];
    expect(eventArg.scheduleId).toBe(8);
  });

  it("retries the event slug on a unique-constraint collision", async () => {
    mockEventTypeCreate.mockRejectedValueOnce({ code: "P2002" });

    const result = await provisionCustomerHandler({ ctx, input: baseInput });

    expect(mockEventTypeCreate).toHaveBeenCalledTimes(2);
    expect(result.eventSlug).toBe("30-minute-meeting-10");
    expect(result.bookingPath).toBe("org/acme/owner/30-minute-meeting-10");
  });
});
