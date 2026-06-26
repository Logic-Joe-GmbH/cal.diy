import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { meRouter } from "@calcom/trpc/server/routers/viewer/me/_router";
import { buildLegacyRequest } from "@lib/buildLegacyCtx";
import { createRouterCaller } from "app/_trpc/context";
import { _generateMetadata } from "app/_utils";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import AppearancePage from "~/settings/my-account/appearance-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("appearance"),
    (t) => t("appearance_description"),
    undefined,
    undefined,
    "/settings/my-account/appearance"
  );

const Page = async () => {
  const session = await getServerSession({ req: buildLegacyRequest(await headers(), await cookies()) });
  const userId = session?.user?.id;
  const redirectUrl = "/auth/login?callbackUrl=/settings/my-account/appearance";

  if (!userId) {
    redirect(redirectUrl);
  }

  const meCaller = await createRouterCaller(meRouter);

  const user = await meCaller.get();

  if (!user) {
    redirect(redirectUrl);
  }

  // Branding is free on cal.diy — no paid-plan gating.
  const hasPaidPlan = true;

  return <AppearancePage user={user} hasPaidPlan={hasPaidPlan} />;
};

export default Page;
