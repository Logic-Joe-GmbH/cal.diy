import { getOrgFullOrigin } from "@calcom/lib/orgDomains";
import { buildLegacyCtx, decodeParams } from "@lib/buildLegacyCtx";
import { getServerSideProps } from "@server/lib/team/[slug]/getServerSideProps";
import type { PageProps } from "app/_types";
import { generateMeetingMetadata } from "app/_utils";
import { withAppDirSsr } from "app/WithAppDirSsr";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import type React from "react";
import type { PageProps as LegacyPageProps } from "~/team/team-view";
import LegacyPage from "~/team/team-view";

const getData: (ctx: ReturnType<typeof buildLegacyCtx>) => Promise<LegacyPageProps> =
  withAppDirSsr<LegacyPageProps>(getServerSideProps);

export const generateMetadata = async ({ params, searchParams }: PageProps): Promise<Metadata> => {
  const { team } = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );
  const decodedParams = decodeParams(await params);
  const slug = decodedParams.slug ?? decodedParams.orgSlug;

  const meeting = {
    title: team.markdownStrippedBio,
    profile: { name: team.name, image: team.profileImageSrc },
  };
  const metadata = await generateMeetingMetadata(
    meeting,
    (t) => team.name || t("nameless_team"),
    (t) => team.name || t("nameless_team"),
    false,
    getOrgFullOrigin(null),
    `/team/${slug}`
  );

  return metadata;
};

const ServerPage = async ({ params, searchParams }: PageProps): Promise<JSX.Element> => {
  const props = await getData(
    buildLegacyCtx(await headers(), await cookies(), await params, await searchParams)
  );

  return <LegacyPage {...props} />;
};

export default ServerPage;
