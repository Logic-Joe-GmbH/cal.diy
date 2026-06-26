// Branding visibility is purely the user/team setting — it is no longer tied to a paid plan.
export function isBrandingHidden(hideBrandingSetting: boolean, _hasPaidPlan?: boolean) {
  return hideBrandingSetting;
}
