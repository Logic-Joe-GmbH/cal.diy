import { stringify } from "node:querystring";
import { WEBAPP_URL_FOR_OAUTH } from "@calcom/lib/constants";
import type { NextApiRequest, NextApiResponse } from "next";
import { encodeOAuthState } from "../../_utils/oauth/encodeOAuthState";
import { getOfficeAppKeys } from "../lib/getOfficeAppKeys";

const scopes = ["User.Read", "Calendars.Read", "Calendars.ReadWrite", "offline_access"];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    const appKeys = await getOfficeAppKeys().catch(() => null);
    const clientId = appKeys?.client_id ?? "";
    if (!clientId) return res.status(400).json({ message: "Office 365 client_id missing." });
    const state = encodeOAuthState(req);
    const params = {
      response_type: "code",
      scope: scopes.join(" "),
      client_id: clientId,
      prompt: "select_account",
      redirect_uri: `${WEBAPP_URL_FOR_OAUTH}/api/integrations/office365calendar/callback`,
      state,
    };
    const query = stringify(params);
    const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${query}`;
    res.status(200).json({ url });
  }
}
