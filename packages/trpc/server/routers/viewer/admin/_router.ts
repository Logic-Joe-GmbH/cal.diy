import { authedAdminProcedure } from "../../../procedures/authedProcedure";
import { router } from "../../../trpc";
import { ZAdminAddOrganizationMemberSchema } from "./addOrganizationMember.schema";
import { ZAdminAssignFeatureToTeamSchema } from "./assignFeatureToTeam.schema";
import { ZCreateCouponSchema } from "./createCoupon.schema";
import { ZAdminCreateOrganizationSchema } from "./createOrganization.schema";
import { ZCreateSelfHostedLicenseSchema } from "./createSelfHostedLicenseKey.schema";
import { ZAdminGetOrganizationSchema } from "./getOrganization.schema";
import { ZAdminGetTeamsForFeatureSchema } from "./getTeamsForFeature.schema";
import { ZAdminInviteOrganizationMemberSchema } from "./inviteOrganizationMember.schema";
import { ZAdminListOrganizationMembersSchema } from "./listOrganizationMembers.schema";
import { ZListMembersSchema } from "./listPaginated.schema";
import { ZAdminProvisionCustomerSchema } from "./provisionCustomer.schema";
import { ZAdminLockUserAccountSchema } from "./lockUserAccount.schema";
import { ZAdminRemoveOrganizationMemberSchema } from "./removeOrganizationMember.schema";
import { ZAdminRemoveTwoFactor } from "./removeTwoFactor.schema";
import { ZAdminPasswordResetSchema } from "./sendPasswordReset.schema";
import { ZSetSMSLockState } from "./setSMSLockState.schema";
import { toggleFeatureFlag } from "./toggleFeatureFlag.procedure";
import { ZAdminUnassignFeatureFromTeamSchema } from "./unassignFeatureFromTeam.schema";
import { ZAdminUpdateOrganizationSchema } from "./updateOrganization.schema";
import { ZAdminUpdateOrganizationMemberRoleSchema } from "./updateOrganizationMemberRole.schema";
import { watchlistRouter } from "./watchlist/_router";

const NAMESPACE = "admin";

const namespaced = (s: string) => `${NAMESPACE}.${s}`;

export const adminRouter = router({
  listPaginated: authedAdminProcedure.input(ZListMembersSchema).query(async (opts) => {
    const { default: handler } = await import("./listPaginated.handler");
    return handler(opts);
  }),
  sendPasswordReset: authedAdminProcedure.input(ZAdminPasswordResetSchema).mutation(async (opts) => {
    const { default: handler } = await import("./sendPasswordReset.handler");
    return handler(opts);
  }),
  lockUserAccount: authedAdminProcedure.input(ZAdminLockUserAccountSchema).mutation(async (opts) => {
    const { default: handler } = await import("./lockUserAccount.handler");
    return handler(opts);
  }),
  toggleFeatureFlag,
  removeTwoFactor: authedAdminProcedure.input(ZAdminRemoveTwoFactor).mutation(async (opts) => {
    const { default: handler } = await import("./removeTwoFactor.handler");
    return handler(opts);
  }),
  getSMSLockStateTeamsUsers: authedAdminProcedure.query(async (opts) => {
    const { default: handler } = await import("./getSMSLockStateTeamsUsers.handler");
    return handler(opts);
  }),
  setSMSLockState: authedAdminProcedure.input(ZSetSMSLockState).mutation(async (opts) => {
    const { default: handler } = await import("./setSMSLockState.handler");
    return handler(opts);
  }),
  createSelfHostedLicense: authedAdminProcedure
    .input(ZCreateSelfHostedLicenseSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./createSelfHostedLicenseKey.handler");
      return handler(opts);
    }),
  createCoupon: authedAdminProcedure.input(ZCreateCouponSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createCoupon.handler");
    return handler(opts);
  }),
  createOrganization: authedAdminProcedure.input(ZAdminCreateOrganizationSchema).mutation(async (opts) => {
    const { default: handler } = await import("./createOrganization.handler");
    return handler(opts);
  }),
  listOrganizations: authedAdminProcedure.query(async () => {
    const { default: handler } = await import("./listOrganizations.handler");
    return handler();
  }),
  addOrganizationMember: authedAdminProcedure
    .input(ZAdminAddOrganizationMemberSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./addOrganizationMember.handler");
      return handler(opts);
    }),
  inviteOrganizationMember: authedAdminProcedure
    .input(ZAdminInviteOrganizationMemberSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./inviteOrganizationMember.handler");
      return handler(opts);
    }),
  provisionCustomer: authedAdminProcedure.input(ZAdminProvisionCustomerSchema).mutation(async (opts) => {
    const { default: handler } = await import("./provisionCustomer.handler");
    return handler(opts);
  }),
  getOrganization: authedAdminProcedure.input(ZAdminGetOrganizationSchema).query(async (opts) => {
    const { default: handler } = await import("./getOrganization.handler");
    return handler(opts);
  }),
  updateOrganization: authedAdminProcedure.input(ZAdminUpdateOrganizationSchema).mutation(async (opts) => {
    const { default: handler } = await import("./updateOrganization.handler");
    return handler(opts);
  }),
  listOrganizationMembers: authedAdminProcedure
    .input(ZAdminListOrganizationMembersSchema)
    .query(async (opts) => {
      const { default: handler } = await import("./listOrganizationMembers.handler");
      return handler(opts);
    }),
  updateOrganizationMemberRole: authedAdminProcedure
    .input(ZAdminUpdateOrganizationMemberRoleSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./updateOrganizationMemberRole.handler");
      return handler(opts);
    }),
  removeOrganizationMember: authedAdminProcedure
    .input(ZAdminRemoveOrganizationMemberSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./removeOrganizationMember.handler");
      return handler(opts);
    }),
  getTeamsForFeature: authedAdminProcedure.input(ZAdminGetTeamsForFeatureSchema).query(async (opts) => {
    const { default: handler } = await import("./getTeamsForFeature.handler");
    return handler(opts);
  }),
  assignFeatureToTeam: authedAdminProcedure.input(ZAdminAssignFeatureToTeamSchema).mutation(async (opts) => {
    const { default: handler } = await import("./assignFeatureToTeam.handler");
    return handler(opts);
  }),
  unassignFeatureFromTeam: authedAdminProcedure
    .input(ZAdminUnassignFeatureFromTeamSchema)
    .mutation(async (opts) => {
      const { default: handler } = await import("./unassignFeatureFromTeam.handler");
      return handler(opts);
    }),
  watchlist: watchlistRouter,
});
