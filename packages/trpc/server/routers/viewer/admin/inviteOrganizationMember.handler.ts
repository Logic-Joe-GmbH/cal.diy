import { randomBytes } from "node:crypto";
import { sendTeamInviteEmail } from "@calcom/emails/organization-email-service";
import { OrganizationRepository } from "@calcom/features/organizations/repositories/OrganizationRepository";
import { ProfileRepository } from "@calcom/features/profile/repositories/ProfileRepository";
import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { getTranslation } from "@calcom/i18n/server";
import { WEBAPP_URL } from "@calcom/lib/constants";
import logger from "@calcom/lib/logger";
import { safeStringify } from "@calcom/lib/safeStringify";
import { prisma } from "@calcom/prisma";
import { MembershipRole } from "@calcom/prisma/enums";
import { TRPCError } from "@trpc/server";
import type { TFunction } from "i18next";
import type { TrpcSessionUser } from "../../../types";
import type { TAdminInviteOrganizationMemberSchema } from "./inviteOrganizationMember.schema";

const log = logger.getSubLogger({ prefix: ["admin/inviteOrganizationMember"] });

const INVITE_EXPIRY_DAYS = 7;

type InviteOrganizationMemberOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TAdminInviteOrganizationMemberSchema;
};

// Sending must never break the invite — for self-hosted instances without SMTP configured the
// admin can still copy the returned invite link. So we log delivery failures instead of throwing.
async function trySendInviteEmail(args: {
  language: TFunction;
  from: string;
  to: string;
  teamName: string;
  joinLink: string;
  isCalcomMember: boolean;
  isAutoJoin: boolean;
}) {
  try {
    await sendTeamInviteEmail({
      language: args.language,
      from: args.from,
      to: args.to,
      teamName: args.teamName,
      joinLink: args.joinLink,
      isCalcomMember: args.isCalcomMember,
      isAutoJoin: args.isAutoJoin,
      isOrg: true,
      parentTeamName: undefined,
      isExistingUserMovedToOrg: false,
      prevLink: null,
      newLink: null,
    });
  } catch (err) {
    log.warn(
      "Failed to send organization invite email; the invite link can still be shared manually",
      safeStringify(err)
    );
  }
}

export const inviteOrganizationMemberHandler = async ({ ctx, input }: InviteOrganizationMemberOptions) => {
  const { organizationId, email, role } = input;

  const orgRepository = new OrganizationRepository(prisma);
  const organization = await orgRepository.findById({ id: organizationId });
  if (!organization || !organization.isOrganization) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Organization not found." });
  }

  const inviterName = ctx.user.name ?? ctx.user.email;
  const translation = await getTranslation(ctx.user.locale ?? "en", "common");

  const userRepository = new UserRepository(prisma);
  const existingUser = await userRepository.findByEmail({ email });

  if (existingUser) {
    const existingOrgId = await ProfileRepository.findFirstOrganizationIdForUser({
      userId: existingUser.id,
    });
    if (existingOrgId === organizationId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This user is already a member of the organization.",
      });
    }
    if (existingOrgId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "This user already belongs to another organization.",
      });
    }

    await orgRepository.addExistingUserAsMember({
      organizationId,
      user: { id: existingUser.id, email: existingUser.email, nonOrgUsername: existingUser.username },
      role: role === "ADMIN" ? MembershipRole.ADMIN : MembershipRole.MEMBER,
    });

    await trySendInviteEmail({
      language: translation,
      from: inviterName,
      to: email,
      teamName: organization.name,
      joinLink: WEBAPP_URL,
      isCalcomMember: true,
      isAutoJoin: true,
    });

    log.info(`Admin added existing user ${email} to organization ${organizationId} as ${role}`);

    return { status: "added" as const, email, role, inviteLink: null };
  }

  // No account yet: issue a verification token tied to the org. When the recipient signs up via the
  // link, the signup handler reads the token's teamId and auto-accepts them into the organization
  // (always as MEMBER — admins can adjust the role afterwards via member management).
  await orgRepository.deleteInviteTokens({ organizationId, email });
  const token = randomBytes(32).toString("hex");
  await orgRepository.createInviteToken({
    organizationId,
    email,
    token,
    expires: new Date(Date.now() + INVITE_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
  });

  const inviteLink = `${WEBAPP_URL}/signup?token=${token}`;

  await trySendInviteEmail({
    language: translation,
    from: inviterName,
    to: email,
    teamName: organization.name,
    joinLink: inviteLink,
    isCalcomMember: false,
    isAutoJoin: false,
  });

  log.info(`Admin invited new user ${email} to organization ${organizationId}`);

  return { status: "invited" as const, email, role, inviteLink };
};

export default inviteOrganizationMemberHandler;
