import process from "node:process";
import { sendBookingReminderEmail } from "@calcom/emails/booking-reminder-email-service";
import { getTranslation } from "@calcom/i18n/server";
import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";
import { defaultResponderForAppDir } from "app/api/defaultResponderForAppDir";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Reminder offsets before the meeting start (minutes).
const REMINDER_OFFSETS_MINUTES = [24 * 60, 60];
// How long after an offset becomes due we still email it (tolerates the cron cadence). Offsets that
// became due longer ago than this — e.g. a last-minute booking — are marked done but NOT emailed, so
// nobody gets a stale "24h reminder" minutes before the meeting.
const GRACE_MINUTES = 60;

async function postHandler(request: NextRequest) {
  const cronApiKey = process.env.CRON_API_KEY;
  const cronSecret = process.env.CRON_SECRET;
  // Refuse to run unauthenticated: without a configured secret an unset env var must never
  // accept "undefined"-style values as a valid key.
  if (!cronApiKey && !cronSecret) {
    return NextResponse.json({ message: "Cron auth is not configured" }, { status: 500 });
  }

  // Header only — query strings are commonly written to access logs. Vercel Cron sends the
  // project's cron secret in the Authorization header.
  const authHeader = request.headers.get("authorization");
  const isAuthorized =
    (!!cronApiKey && authHeader === cronApiKey) || (!!cronSecret && authHeader === `Bearer ${cronSecret}`);
  if (!isAuthorized) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const now = new Date();
  const maxOffset = Math.max(...REMINDER_OFFSETS_MINUTES);
  const windowEnd = new Date(now.getTime() + maxOffset * 60_000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: BookingStatus.ACCEPTED,
      startTime: { gte: now, lte: windowEnd },
    },
    select: {
      id: true,
      uid: true,
      title: true,
      startTime: true,
      metadata: true,
      eventType: { select: { title: true } },
      user: { select: { email: true, name: true, locale: true, timeZone: true } },
      attendees: { select: { email: true, name: true, locale: true, timeZone: true } },
    },
  });

  let remindersSent = 0;

  for (const booking of bookings) {
    const metadata =
      booking.metadata && typeof booking.metadata === "object" && !Array.isArray(booking.metadata)
        ? (booking.metadata as Record<string, unknown>)
        : {};
    const alreadySent = Array.isArray(metadata.remindersSent) ? (metadata.remindersSent as string[]) : [];

    const toSend: string[] = [];
    const toSuppress: string[] = [];

    for (const offset of REMINDER_OFFSETS_MINUTES) {
      const label = String(offset);
      if (alreadySent.includes(label)) continue;
      const dueAt = booking.startTime.getTime() - offset * 60_000;
      if (now.getTime() < dueAt) continue; // not due yet
      if (now.getTime() <= dueAt + GRACE_MINUTES * 60_000) toSend.push(label);
      else toSuppress.push(label);
    }

    if (toSend.length === 0 && toSuppress.length === 0) continue;

    if (toSend.length > 0) {
      const eventTitle = booking.eventType?.title || booking.title;
      const recipients = [
        ...booking.attendees.map((a) => ({
          email: a.email,
          name: a.name,
          locale: a.locale,
          timeZone: a.timeZone,
        })),
        ...(booking.user?.email
          ? [
              {
                email: booking.user.email,
                name: booking.user.name,
                locale: booking.user.locale,
                timeZone: booking.user.timeZone,
              },
            ]
          : []),
      ];

      for (const recipient of recipients) {
        if (!recipient.email) continue;
        const language = await getTranslation(recipient.locale ?? "en", "common");
        await sendBookingReminderEmail({
          to: recipient.email,
          recipientName: recipient.name,
          eventTitle,
          startTime: booking.startTime.toISOString(),
          timeZone: recipient.timeZone ?? "UTC",
          locale: recipient.locale ?? "en",
          bookingUid: booking.uid,
          language,
        });
      }
      remindersSent += toSend.length;
    }

    await prisma.booking.update({
      where: { id: booking.id },
      data: { metadata: { ...metadata, remindersSent: [...alreadySent, ...toSend, ...toSuppress] } },
    });
  }

  return NextResponse.json({ remindersSent, bookingsScanned: bookings.length });
}

export const POST = defaultResponderForAppDir(postHandler);
