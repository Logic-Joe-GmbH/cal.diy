# Provisioning a customer booking widget

The repeatable flow for putting a booking widget on a customer's website. Everything is done by an
employee in the admin area — the customer never logs in.

## 1. Create the customer organization

**Admin → Organizations → Create**

- **Name** / **Slug** — the customer (the slug becomes the booking subdomain `slug.<your-domain>` and the
  `team/<slug>` path).
- **Owner email** — an existing user who owns the org. (Use the invite flow on the Members panel to add
  people who don't have an account yet — they receive an email with a sign-up link, or you copy the
  generated invite link if SMTP isn't configured.)

## 2. Brand it

**Admin → Organizations → (select org) → Organization settings**

Set name, logo URL, banner, and **brand color**. This brand color automatically flows into the booking
page and the embed for any of the org's event types — no per-embed configuration needed.

## 3. Set up an event type + availability

As the org owner/member (normal app UI):

- Create an event type (e.g. "30 min meeting") under the member or the org's team.
- Set the weekly availability / connect a calendar (see [calendar-integrations.md](./calendar-integrations.md))
  so slots reflect real free/busy and avoid double-bookings.

The bookable URL is then one of:

- `https://<slug>.<your-domain>/` — org profile (lists members)
- `https://<your-domain>/team/<slug>/<event>` — a team event
- `https://<your-domain>/<member>/<event>` — a member's event

## 4. Grab the embed snippet

**Admin → Organizations → (select org) → Embed**

- Set **Booking link path** to the event you want embedded (e.g. `team/<slug>/30min`).
- Optionally override the **brand color** (leave blank to use the org's configured color).
- Copy the **Inline embed** (renders in a page element) or **Popup button** snippet and paste it into the
  customer's website.

The embed works cross-origin on any domain (no `X-Frame-Options` restriction), is no-index, and respects
the org's `hideBranding` setting for a clean white-label look. Per-placement overrides are also available
via URL params on the booking link: `?brandColor=%23ff0000`, `?theme=dark`.

## What is automated vs. manual today

- **Automated:** org + owner + member invites, branding, embed snippet generation.
- **Manual (normal app UI):** event type and availability/calendar setup. Wiring a true one-click
  "create org + default event type + default schedule" is a sensible next step but needs a dedicated
  event-type creation path; it is intentionally left to the standard UI for now.
