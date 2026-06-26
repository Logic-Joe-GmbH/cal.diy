"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Avatar } from "@calcom/ui/components/avatar";
import type { TeamPageProps } from "@server/lib/team/[slug]/getServerSideProps";
import Link from "next/link";

export type PageProps = TeamPageProps;

export default function TeamPage({ team, members }: PageProps) {
  const { t } = useLocale();
  const teamName = team.name || t("nameless_team");
  const isBioEmpty = !team.bio || !team.bio.replace("<p><br></p>", "").length;

  return (
    <main className="dark:bg-default bg-subtle mx-auto max-w-3xl rounded-md px-4 pb-12 pt-12">
      <div className="mx-auto mb-8 max-w-3xl text-center">
        <Avatar alt={teamName} imageSrc={team.profileImageSrc} size="lg" />
        <p className="font-cal text-emphasis mb-2 mt-4 text-2xl tracking-wider" data-testid="team-name">
          {team.parentName && `${team.parentName} `}
          {teamName}
        </p>
        {!isBioEmpty && (
          // biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via safeBio
          <div
            className="text-subtle wrap-break-word text-sm [&_a]:text-blue-500 [&_a]:underline [&_a]:hover:text-blue-600"
            dangerouslySetInnerHTML={{ __html: team.safeBio }}
          />
        )}
      </div>

      {team.isPrivate ? (
        <div className="w-full text-center">
          <h2 data-testid="you-cannot-see-team-members" className="text-emphasis font-semibold">
            {t("you_cannot_see_team_members")}
          </h2>
        </div>
      ) : (
        members.length > 0 && (
          <ul className="border-subtle divide-subtle bg-default divide-y rounded-md border">
            {members.map((member) => (
              <li
                key={member.username}
                className="hover:bg-cal-muted transition first:rounded-t-md last:rounded-b-md">
                <Link
                  prefetch={false}
                  href={`/${member.username}`}
                  data-testid="team-member-link"
                  className="flex items-center gap-3 px-6 py-4">
                  <Avatar alt={member.name || member.username || ""} imageSrc={member.avatarUrl} size="sm" />
                  <span className="text-default text-sm font-semibold">{member.name || member.username}</span>
                </Link>
              </li>
            ))}
          </ul>
        )
      )}
    </main>
  );
}
