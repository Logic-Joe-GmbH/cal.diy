-- Enable the calendar integrations on cal.diy out of the box.
--
-- Free providers (CalDAV, Apple/iCloud, ICS feed) work immediately — they need no OAuth
-- credentials, users just enter their own login/URL.
--
-- Google Calendar and Office 365 are enabled too, but additionally require OAuth credentials.
-- Configure them in Admin → Apps → Calendar, or via env vars:
--   GOOGLE_API_CREDENTIALS                          (Google, JSON from Google Cloud Console)
--   MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET     (Office 365)
INSERT INTO "App" ("slug", "dirName", "categories", "keys", "enabled", "createdAt", "updatedAt")
VALUES
  ('caldav-calendar', 'caldavcalendar', ARRAY['calendar']::"AppCategories"[], NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('apple-calendar', 'applecalendar', ARRAY['calendar']::"AppCategories"[], NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('ics-feed', 'ics-feedcalendar', ARRAY['calendar']::"AppCategories"[], NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('google-calendar', 'googlecalendar', ARRAY['calendar']::"AppCategories"[], NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('office365-calendar', 'office365calendar', ARRAY['calendar']::"AppCategories"[], NULL, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("slug") DO UPDATE SET "enabled" = true, "updatedAt" = CURRENT_TIMESTAMP;
