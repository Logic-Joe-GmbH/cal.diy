"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { Form, TextAreaField, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type SettingsFormValues = {
  name: string;
  bio: string;
  logoUrl: string;
  brandColor: string;
  bannerUrl: string;
  hideBranding: boolean;
};

export function OrgSettingsForm({ organizationId }: { organizationId: number }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const orgQuery = trpc.viewer.admin.getOrganization.useQuery({ organizationId });
  const form = useForm<SettingsFormValues>();
  const { reset } = form;

  useEffect(() => {
    if (!orgQuery.data) return;
    reset({
      name: orgQuery.data.name ?? "",
      bio: orgQuery.data.bio ?? "",
      logoUrl: orgQuery.data.logoUrl ?? "",
      brandColor: orgQuery.data.brandColor ?? "",
      bannerUrl: orgQuery.data.bannerUrl ?? "",
      hideBranding: orgQuery.data.hideBranding ?? false,
    });
  }, [orgQuery.data, reset]);

  const updateMutation = trpc.viewer.admin.updateOrganization.useMutation({
    onSuccess: async () => {
      showToast(t("settings_updated_successfully"), "success");
      await utils.viewer.admin.getOrganization.invalidate({ organizationId });
      await utils.viewer.admin.listOrganizations.invalidate();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  return (
    <Form
      form={form}
      className="border-subtle stack-y-4 rounded-md border p-6"
      handleSubmit={(values) => updateMutation.mutate({ organizationId, ...values })}>
      <h2 className="text-emphasis text-base font-semibold">{t("organization_settings")}</h2>
      <TextField label={t("name")} {...form.register("name")} />
      <TextAreaField label={t("bio")} {...form.register("bio")} />
      <TextField label={t("logo_url")} {...form.register("logoUrl")} />
      <TextField label={t("banner_url")} {...form.register("bannerUrl")} />
      <TextField label={t("brand_color")} {...form.register("brandColor")} />
      <label className="flex items-center gap-2">
        <input type="checkbox" className="text-emphasis" {...form.register("hideBranding")} />
        <span className="text-default text-sm">{t("hide_branding")}</span>
      </label>
      <Button type="submit" loading={updateMutation.isPending}>
        {t("save")}
      </Button>
    </Form>
  );
}

export default OrgSettingsForm;
