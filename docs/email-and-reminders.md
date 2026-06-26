# Booking emails & reminders (cal.diy)

## Booking confirmation emails (work out of the box)

When a booking is created, confirmation emails go to the **attendee** and the **organizer**
synchronously — there is no extra setup beyond configuring an SMTP/Resend transport. They are only
skipped for dry-runs, when an event type sets `disableStandardEmails`, or when the global **"emails"
feature flag kill-switch** is on.

Configure a transport via env (pick one):

```bash
# Resend
RESEND_API_KEY="re_…"

# or a full SMTP connection string
EMAIL_SERVER="smtp://user:pass@smtp.host.com:587"

# or discrete SMTP settings
EMAIL_SERVER_HOST="smtp.host.com"
EMAIL_SERVER_PORT="587"
EMAIL_SERVER_USER="…"
EMAIL_SERVER_PASSWORD="…"

# From address (all transports)
EMAIL_FROM="bookings@example.com"
```

## Upcoming-meeting reminders (cron)

Reminders for **confirmed** bookings are sent by a cron endpoint. Because the async task worker isn't
required, this runs via any scheduler that can make an authenticated HTTP request (Vercel Cron, system
cron, an uptime pinger, …).

- **Endpoint:** `POST /api/cron/upcomingBookingReminder`
- **Auth:** send the cron secret in the `authorization` **header** (not the query string, which leaks into
  access logs). At least one of `CRON_API_KEY` / `CRON_SECRET` must be set, otherwise the endpoint
  returns 500 rather than running unauthenticated:
  - `authorization: <CRON_API_KEY>` or `authorization: Bearer <CRON_SECRET>`
- **Offsets:** 24 hours and 1 hour before start (edit `REMINDER_OFFSETS_MINUTES` in the route).
- **Recipients:** all attendees + the organizer, each in their own locale/timezone.
- **De-duplication:** each booking records which offsets were already sent in `booking.metadata.remindersSent`,
  so a reminder is never sent twice. Offsets that became due more than `GRACE_MINUTES` (60) ago — e.g. for a
  last-minute booking — are marked done without emailing, so nobody gets a stale "24h reminder" minutes
  before the meeting.

Run it every 15–60 minutes. Example Vercel Cron (`vercel.json`):

```json
{
  "crons": [
    { "path": "/api/cron/upcomingBookingReminder", "schedule": "*/30 * * * *" }
  ]
}
```

Set `CRON_API_KEY` (and/or `CRON_SECRET`) in the environment; Vercel Cron automatically sends the
project's cron secret in the `authorization` header.
