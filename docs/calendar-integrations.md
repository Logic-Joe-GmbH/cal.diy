# Calendar Integrations (cal.diy)

How to connect calendars on a cal.diy instance. There are two classes of providers:

- **Free / zero-config** — CalDAV, Apple (iCloud), ICS feed. No admin setup, no API keys. Users just enter their own credentials/URL.
- **OAuth** — Google Calendar, Office 365. Require OAuth app credentials, configured **once** by an admin (via env vars or the admin UI).

All five providers are enabled out of the box by the `20260626120000_enable_calendar_apps` migration. Re-enabling or toggling individual apps later is done in **Admin → Apps → Calendar**.

---

## Free providers (no setup required)

These work the moment the instance is up — there is nothing for an admin to configure.

| Provider | What the user needs | Two-way sync | Notes |
| --- | --- | --- | --- |
| **CalDAV** | Server URL + username + password | ✅ | Generic CalDAV (Nextcloud, Fastmail, mailbox.org, …). |
| **Apple / iCloud** | Apple ID + an **app-specific password** | ✅ | iCloud is CalDAV under the hood. The user creates an app-specific password at appleid.apple.com. |
| **ICS feed** | A public `.ics` URL | ⬇️ read-only | Import/conflict-check only — no write-back. Good for "show busy" from any calendar that exposes an ICS link. |

Users connect these under **Settings → Apps / Calendars → Add calendar** and pick the provider.

---

## Google Calendar (OAuth)

### 1. Create OAuth credentials in Google Cloud

1. Go to <https://console.cloud.google.com/> → create (or pick) a project.
2. **APIs & Services → Library** → enable **Google Calendar API**.
3. **APIs & Services → OAuth consent screen** → configure (External, add the scopes below, add yourself as a test user while in testing).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
5. Add the **Authorized redirect URI**:

   ```
   <WEBAPP_URL>/api/integrations/googlecalendar/callback
   ```

   e.g. `https://app.example.com/api/integrations/googlecalendar/callback`.
6. Download the client JSON (or copy the client ID + secret).

Scopes used: `userinfo.profile` + Google Calendar read/write.

### 2. Configure the credentials in cal.diy

**Option A — env var (recommended for reproducible deploys):**

```bash
# The full JSON downloaded from Google Cloud Console (with or without the surrounding "web" key)
GOOGLE_API_CREDENTIALS='{"web":{"client_id":"…","client_secret":"…","redirect_uris":["https://app.example.com/api/integrations/googlecalendar/callback"]}}'
```

**Option B — Admin UI:** Admin → Apps → Calendar → Google Calendar → set keys (`client_id`, `client_secret`, `redirect_uris`).

DB-configured keys take precedence; the env var is the fallback.

---

## Office 365 / Outlook Calendar (OAuth)

### 1. Register an app in Microsoft Entra (Azure AD)

1. <https://portal.azure.com/> → **Microsoft Entra ID → App registrations → New registration**.
2. Supported account types: typically **Accounts in any organizational directory and personal Microsoft accounts**.
3. **Redirect URI** (type *Web*):

   ```
   <WEBAPP_URL>/api/integrations/office365calendar/callback
   ```
4. **Certificates & secrets → New client secret** → copy the secret **value**.
5. **API permissions → Microsoft Graph → Delegated** → add: `User.Read`, `Calendars.Read`, `Calendars.ReadWrite`, `offline_access`.

### 2. Configure the credentials in cal.diy

**Option A — env vars (recommended):**

```bash
MS_GRAPH_CLIENT_ID="…"      # Application (client) ID
MS_GRAPH_CLIENT_SECRET="…"  # the secret value (not the secret ID)
```

**Option B — Admin UI:** Admin → Apps → Calendar → Office 365 Calendar → set keys (`client_id`, `client_secret`).

DB-configured keys take precedence; the env vars are the fallback.

---

## Redirect URI reference

| Provider | Redirect URI |
| --- | --- |
| Google Calendar | `<WEBAPP_URL>/api/integrations/googlecalendar/callback` |
| Office 365 Calendar | `<WEBAPP_URL>/api/integrations/office365calendar/callback` |

`<WEBAPP_URL>` is `NEXT_PUBLIC_WEBAPP_URL`. Locally, OAuth uses `http://localhost:3000` (see `WEBAPP_URL_FOR_OAUTH`), so add a localhost redirect URI too while developing.

---

## Troubleshooting

- **"… app keys are not configured"** — neither DB keys nor the env var(s) are set for that provider.
- **`redirect_uri_mismatch` (Google) / `AADSTS50011` (Microsoft)** — the redirect URI in the provider console must match `<WEBAPP_URL>/api/integrations/<provider>/callback` exactly, including scheme and host.
- **App not visible to users** — make sure it is enabled in Admin → Apps → Calendar (the seed migration enables all five by default).
