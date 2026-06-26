import process from "node:process";
import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import { z } from "zod";
import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const googleAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
  redirect_uris: z.array(z.string()),
});

type GoogleAppKeys = z.infer<typeof googleAppKeysSchema>;

/**
 * Reproducible deployments configure the Google OAuth credentials via the
 * GOOGLE_API_CREDENTIALS env var (the JSON you download from Google Cloud Console,
 * with or without the surrounding `web` key) instead of pasting them into Admin → Apps.
 */
function getGoogleAppKeysFromEnv(): GoogleAppKeys | null {
  const raw = process.env.GOOGLE_API_CREDENTIALS;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    const creds = parsed.web ?? parsed;
    if (!creds.client_id || !creds.client_secret) return null;
    return {
      client_id: creds.client_id,
      client_secret: creds.client_secret,
      redirect_uris: Array.isArray(creds.redirect_uris)
        ? creds.redirect_uris
        : [`${WEBAPP_URL_FOR_OAUTH}/api/integrations/googlecalendar/callback`],
    };
  } catch {
    return null;
  }
}

export const getGoogleAppKeys = async (): Promise<GoogleAppKeys> => {
  // DB-configured keys (Admin → Apps) take precedence, env is the fallback for deployments.
  const fromDb = await getParsedAppKeysFromSlug("google-calendar", googleAppKeysSchema).catch(() => null);
  if (fromDb?.client_id && fromDb?.client_secret) return fromDb;

  const fromEnv = getGoogleAppKeysFromEnv();
  if (fromEnv) return fromEnv;

  // Let downstream surface the configuration error consistently.
  if (fromDb) return fromDb;
  throw new Error(
    "Google Calendar app keys are not configured. Set them in Admin → Apps → Calendar or via the GOOGLE_API_CREDENTIALS env var."
  );
};
