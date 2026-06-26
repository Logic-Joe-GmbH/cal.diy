import { getOrgUsernameFromEmail } from "@calcom/features/auth/signup/utils/getOrgUsernameFromEmail";
import { EventTypeRepository } from "@calcom/features/eventtypes/repositories/eventTypeRepository";
import { isNotACompanyEmail } from "@calcom/features/organizations/lib/isCompanyEmail";
import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { RESERVED_SUBDOMAINS, WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { isPrismaError } from "@calcom/lib/server/getServerErrorFromUnknown";
import slugify from "@calcom/lib/slugify";
import { prisma } from "@calcom/prisma";
import { TRPCError } from "@trpc/server";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminProvisionCustomerSchema } from "./provisionCustomer.schema";

const log = logger.getSubLogger({ prefix: ["admin/provisionCustomer"] });

type ProvisionCustomerOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminProvisionCustomerSchema;
};

export const provisionCustomerHandler = async ({ input }: ProvisionCustomerOptions) => {
  const { name, slug, orgOwnerEmail, eventTitle, eventLength } = input;

  // --- Validate (same guarantees as createOrganization) ---
  if (RESERVED_SUBDOMAINS.includes(slug)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "organization_url_taken" });
  }

  const orgRepository = new OrganizationRepository(prisma);
  if (await orgRepository.findBySlug({ slug })) {
    throw new TRPCError({ code: "CONFLICT", message: "organization_url_taken" });
  }

  const userRepository = new UserRepository(prisma);
  const owner = await userRepository.findByEmail({ email: orgOwnerEmail });
  if (!owner) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: `No user found with email ${orgOwnerEmail}. The organization owner must be an existing user.`,
    });
  }

  const ownerExistingOrgId = await ProfileRepository.findFirstOrganizationIdForUser({ userId: owner.id });
  if (ownerExistingOrgId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "The designated owner already belongs to an organization.",
    });
  }

  // --- 1. Create the organization with the owner ---
  const autoAcceptEmail = isNotACompanyEmail(orgOwnerEmail) ? "" : orgOwnerEmail.split("@")[1];
  const { organization } = await orgRepository.createWithExistingUserAsOwner({
    orgData: {
      name,
      slug,
      isOrganizationConfigured: true,
      isOrganizationAdminReviewed: true,
      autoAcceptEmail,
      seats: null,
      pricePerSeat: null,
      isPlatform: false,
      logoUrl: null,
      bio: null,
      brandColor: null,
      bannerUrl: null,
      requestedSlug: slug,
    },
    owner: { id: owner.id, email: owner.email, nonOrgUsername: owner.username },
  });

  // --- 2. Ensure the owner has an availability schedule for the event ---
  const scheduleRepository = new ScheduleRepository(prisma);
  let scheduleId: number;
  try {
    scheduleId = await scheduleRepository.getDefaultScheduleId(owner.id);
  } catch {
    const schedule = await scheduleRepository.createDefaultSchedule({
      userId: owner.id,
      name: "Working Hours",
    });
    scheduleId = schedule.id;
  }

  // --- 3. Create a default, bookable event type for the owner ---
  const eventTypeRepository = new EventTypeRepository(prisma);
  // Locations are intentionally omitted — the booking flow falls back to the free Jitsi video link.
  const baseSlug = slugify(eventTitle);
  let eventSlug = baseSlug;
  try {
    await eventTypeRepository.create({
      title: eventTitle,
      slug: eventSlug,
      length: eventLength,
      userId: owner.id,
      scheduleId,
    });
  } catch (error) {
    // The owner may already have an event with this slug — retry once with an org-unique suffix.
    if (isPrismaError(error) && error.code === "P2002") {
      eventSlug = `${baseSlug}-${organization.id}`;
      await eventTypeRepository.create({
        title: eventTitle,
        slug: eventSlug,
        length: eventLength,
        userId: owner.id,
        scheduleId,
      });
    } else {
      throw error;
    }
  }

  const ownerUsername = getOrgUsernameFromEmail(owner.email, autoAcceptEmail || null);
  // Works without wildcard DNS: the org context is resolved from the orgSlug path segment.
  const bookingPath = `org/${slug}/${ownerUsername}/${eventSlug}`;

  log.info(`Admin provisioned customer org ${organization.id} (${slug}) with event ${eventSlug}`);

  return {
    organizationId: organization.id,
    slug: organization.slug,
    ownerUsername,
    eventSlug,
    bookingPath,
    bookingUrl: `${WEBAPP_URL}/${bookingPath}`,
  };
};

export default provisionCustomerHandler;
