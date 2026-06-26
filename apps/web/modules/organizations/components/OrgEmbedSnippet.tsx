"use client";

import { EMBED_LIB_URL, WEBAPP_URL } from "@calcom/lib/constants";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import { Button } from "@calcom/ui/components/button";
import { Label, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useMemo, useState } from "react";

// The self-executing loader that boots the Cal embed SDK on a customer's website.
const calLoader = (embedLibUrl: string) =>
  `(function (C, A, L) { let p = function (a, ar) { a.q.push(ar); }; let d = C.document; C.Cal = C.Cal || function () { let cal = C.Cal; let ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement("script")).src = A; cal.loaded = true; } if (ar[0] === L) { const api = function () { p(api, arguments); }; const namespace = ar[1]; api.q = api.q || []; if (typeof namespace === "string") { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ["initNamespace", namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, "${embedLibUrl}", "init");`;

function buildConfig(brandColor: string) {
  const config: Record<string, string> = { layout: "month_view" };
  if (brandColor) config.brandColor = brandColor;
  return config;
}

function buildInlineSnippet(calLink: string, brandColor: string) {
  return `<!-- Cal inline embed code begins -->
<div style="width:100%;height:100%;overflow:scroll" id="my-cal-inline"></div>
<script type="text/javascript">
  ${calLoader(EMBED_LIB_URL)}
  Cal("init", { origin: "${WEBAPP_URL}" });
  Cal("inline", {
    elementOrSelector: "#my-cal-inline",
    calLink: "${calLink}",
    config: ${JSON.stringify(buildConfig(brandColor))}
  });
</script>
<!-- Cal inline embed code ends -->`;
}

function buildPopupSnippet(calLink: string, brandColor: string) {
  return `<!-- Cal popup button code begins -->
<button data-cal-link="${calLink}" data-cal-config='${JSON.stringify(buildConfig(brandColor))}'>
  Book a meeting
</button>
<script type="text/javascript">
  ${calLoader(EMBED_LIB_URL)}
  Cal("init", { origin: "${WEBAPP_URL}" });
</script>
<!-- Cal popup button code ends -->`;
}

function SnippetBox({ label, value }: { label: string; value: string }) {
  const { t } = useLocale();
  const copy = async () => {
    await navigator.clipboard.writeText(value);
    showToast(t("copied"), "success");
  };
  return (
    <div className="stack-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button type="button" color="secondary" size="sm" onClick={copy}>
          {t("copy")}
        </Button>
      </div>
      <textarea
        readOnly
        rows={6}
        className="border-default bg-subtle text-default block w-full rounded-md font-mono text-xs"
        value={value}
      />
    </div>
  );
}

export function OrgEmbedSnippet({
  slug,
  brandColor,
  initialPath,
}: {
  slug: string | null;
  brandColor?: string | null;
  initialPath?: string;
}) {
  const { t } = useLocale();
  const [calLink, setCalLink] = useState(initialPath ?? (slug ? `team/${slug}` : ""));
  const [color, setColor] = useState(brandColor ?? "");

  const inlineSnippet = useMemo(() => buildInlineSnippet(calLink, color), [calLink, color]);
  const popupSnippet = useMemo(() => buildPopupSnippet(calLink, color), [calLink, color]);

  const bookingUrl = `${WEBAPP_URL}/${calLink}`;

  return (
    <div className="border-subtle stack-y-4 rounded-md border p-6">
      <div>
        <h2 className="text-emphasis text-base font-semibold">{t("embed")}</h2>
        <p className="text-subtle text-xs">{t("embed_snippet_description")}</p>
      </div>

      <div>
        <TextField
          label={t("booking_link_path")}
          value={calLink}
          onChange={(e) => setCalLink(e.target.value.replace(/^\/+/, ""))}
        />
        <p className="text-subtle mt-1 break-all text-xs">{bookingUrl}</p>
      </div>
      <TextField
        label={t("brand_color")}
        placeholder="#292929"
        value={color}
        onChange={(e) => setColor(e.target.value)}
      />

      <SnippetBox label={t("inline_embed")} value={inlineSnippet} />
      <SnippetBox label={t("popup_button")} value={popupSnippet} />
    </div>
  );
}

export default OrgEmbedSnippet;
