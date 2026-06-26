import process from "node:process";
import { z } from "zod";
import getParsedAppKeysFromSlug from "../../_utils/getParsedAppKeysFromSlug";

const officeAppKeysSchema = z.object({
  client_id: z.string(),
  client_secret: z.string(),
});

type OfficeAppKeys = z.infer<typeof officeAppKeysSchema>;

/**
 * Reproducible deployments configure the Microsoft Graph OAuth credentials via the
 * MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET env vars instead of pasting them into Admin → Apps.
 */
function getOfficeAppKeysFromEnv(): OfficeAppKeys | null {
  const client_id = process.env.MS_GRAPH_CLIENT_ID;
  const client_secret = process.env.MS_GRAPH_CLIENT_SECRET;
  if (!client_id || !client_secret) return null;
  return { client_id, client_secret };
}

export const getOfficeAppKeys = async (): Promise<OfficeAppKeys> => {
  // DB-configured keys (Admin → Apps) take precedence, env is the fallback for deployments.
  const fromDb = await getParsedAppKeysFromSlug("office365-calendar", officeAppKeysSchema).catch(() => null);
  if (fromDb?.client_id && fromDb?.client_secret) return fromDb;

  const fromEnv = getOfficeAppKeysFromEnv();
  if (fromEnv) return fromEnv;

  if (fromDb) return fromDb;
  throw new Error(
    "Office 365 Calendar app keys are not configured. Set them in Admin → Apps → Calendar or via the MS_GRAPH_CLIENT_ID / MS_GRAPH_CLIENT_SECRET env vars."
  );
};
