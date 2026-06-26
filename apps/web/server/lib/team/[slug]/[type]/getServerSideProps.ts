import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";
import { orgDomainConfig } from "@calcom/lib/orgDomains";
import slugify from "@calcom/lib/slugify";
import { RedirectType } from "@calcom/prisma/enums";
import { handleOrgRedirect } from "@lib/handleOrgRedirect";
import {
  type Props,
  processReschedule,
  processSeatedEvent,
} from "@server/lib/[user]/[type]/getServerSideProps";
import type { GetServerSidePropsContext } from "next";
import { z } from "zod";

const paramsSchema = z.object({
  type: z.string().transform((s) => slugify(s)),
  slug: z.string().transform((s) => slugify(s)),
});

// Team event booking page. The team slug takes the place of the username, and we
// pass isTeamEvent=true so getPublicEvent resolves the event by team instead of user.
export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const session = await getServerSession({ req: context.req });
  const { slug: teamSlug, type: slug } = paramsSchema.parse(context.params);
  const { rescheduleUid, bookingUid } = context.query;
  const allowRescheduleForCancelledBooking = context.query.allowRescheduleForCancelledBooking === "true";
  const { currentOrgDomain, isValidOrgDomain } = orgDomainConfig(context.req, context.params?.orgSlug);
  const org = isValidOrgDomain ? currentOrgDomain : null;

  const redirect = await handleOrgRedirect({
    slugs: [teamSlug],
    redirectType: RedirectType.Team,
    eventTypeSlug: slug,
    context,
    currentOrgDomain: org,
  });
  if (redirect) {
    return redirect;
  }

  const eventData = await EventRepository.getPublicEvent(
    {
      username: teamSlug,
      eventSlug: slug,
      isTeamEvent: true,
      org,
      fromRedirectOfNonOrgLink: context.query.orgRedirection === "true",
    },
    session?.user?.id
  );

  if (!eventData) {
    return { notFound: true } as const;
  }

  const props: Props = {
    eventData,
    user: teamSlug,
    slug,
    isBrandingHidden: false,
    isSEOIndexable: true,
    themeBasis: teamSlug,
    bookingUid: bookingUid ? `${bookingUid}` : null,
    rescheduleUid: null,
    orgBannerUrl: null,
  };

  if (rescheduleUid) {
    const processRescheduleResult = await processReschedule({
      props,
      rescheduleUid,
      session,
      allowRescheduleForCancelledBooking,
    });
    if (processRescheduleResult) {
      return processRescheduleResult;
    }
  } else if (bookingUid) {
    const processSeatResult = await processSeatedEvent({
      props,
      bookingUid,
      allowRescheduleForCancelledBooking,
    });
    if (processSeatResult) {
      return processSeatResult;
    }
  }

  return { props };
};
