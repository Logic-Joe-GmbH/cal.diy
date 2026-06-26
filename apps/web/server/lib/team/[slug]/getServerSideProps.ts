import { getOrgOrTeamAvatar } from "@calcom/lib/defaultAvatarImage";
import { markdownToSafeHTML } from "@calcom/lib/markdownToSafeHTML";
import { getSlugOrRequestedSlug, orgDomainConfig } from "@calcom/lib/orgDomains";
import { stripMarkdown } from "@calcom/lib/stripMarkdown";
import { prisma } from "@calcom/prisma";
import { RedirectType } from "@calcom/prisma/enums";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";
import type { GetServerSideProps } from "next";

type TeamMember = {
  name: string | null;
  username: string | null;
  avatarUrl: string | null;
};

export type TeamPageProps = {
  team: {
    id: number;
    name: string;
    slug: string | null;
    bio: string | null;
    safeBio: string;
    markdownStrippedBio: string;
    profileImageSrc: string;
    hideBranding: boolean;
    isPrivate: boolean;
    isOrganization: boolean;
    parentName: string | null;
  };
  members: TeamMember[];
  isValidOrgDomain: boolean;
};

const firstQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value;

export const getServerSideProps: GetServerSideProps<TeamPageProps> = async (context) => {
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const slug = firstQueryValue(context.query.slug) ?? firstQueryValue(context.query.orgSlug);

  if (!slug) {
    return { notFound: true } as const;
  }

  const redirect = await handleOrgRedirect({
    slugs: [slug],
    redirectType: RedirectType.Team,
    eventTypeSlug: null,
    context,
    currentOrgDomain: isValidOrgDomain ? currentOrgDomain : null,
  });
  if (redirect) {
    return redirect;
  }

  const team = await prisma.team.findFirst({
    where: getSlugOrRequestedSlug(slug),
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      bio: true,
      hideBranding: true,
      isPrivate: true,
      isOrganization: true,
      parent: {
        select: {
          name: true,
          logoUrl: true,
        },
      },
      members: {
        where: { accepted: true },
        select: {
          user: {
            select: {
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!team) {
    return { notFound: true } as const;
  }

  const members: TeamMember[] = team.isPrivate
    ? []
    : team.members
        .map(({ user }) => ({
          name: user.name,
          username: user.username,
          avatarUrl: user.avatarUrl,
        }))
        .filter((member) => !!member.username);

  return {
    props: {
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        bio: team.bio,
        safeBio: markdownToSafeHTML(team.bio) || "",
        markdownStrippedBio: stripMarkdown(team.bio || ""),
        profileImageSrc: getOrgOrTeamAvatar(team),
        hideBranding: team.hideBranding,
        isPrivate: team.isPrivate,
        isOrganization: team.isOrganization,
        parentName: team.parent?.name ?? null,
      },
      members,
      isValidOrgDomain,
    },
  };
};
