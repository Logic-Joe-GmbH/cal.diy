import { buildLegacyCtx } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/team/[slug]/getServerSideProps";
import type { PageProps as ServerPageProps } from "app/_types";
import { withAppDirSsr } from "app/WithAppDirSsr";
import { cookies, headers } from "next/headers";
import type { PageProps as LegacyPageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

export const generateMetadata = async () => {
  return {
    robots: {
      follow: false,
      index: false,
    },
  };
};

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

const ServerPage = async ({ params, searchParams }: ServerPageProps): Promise<JSX.Element> => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};

export default ServerPage;
