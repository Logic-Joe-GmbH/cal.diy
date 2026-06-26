"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmailField, Form, Label, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { OrgEmbedSnippet } from "~/organizations/components/OrgEmbedSnippet";

type ProvisionFormValues = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
  eventTitle: string;
  eventLength: number;
};

type ProvisionResult = {
  slug: string | null;
  bookingPath: string;
  bookingUrl: string;
};

export function ProvisionCustomerForm() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const [result, setResult] = useState<ProvisionResult | null>(null);
  const form = useForm<ProvisionFormValues>({
    defaultValues: {
      name: "",
      slug: "",
      orgOwnerEmail: "",
      eventTitle: "30 Minute Meeting",
      eventLength: 30,
    },
  });

  const mutation = trpc.viewer.admin.provisionCustomer.useMutation({
    onSuccess: async (data) => {
      showToast(t("customer_provisioned_successfully"), "success");
      setResult({ slug: data.slug, bookingPath: data.bookingPath, bookingUrl: data.bookingUrl });
      form.reset();
      await utils.viewer.admin.listOrganizations.invalidate();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  return (
    <div className="border-subtle stack-y-4 rounded-md border p-6">
      <div>
        <h2 className="text-emphasis text-base font-semibold">{t("provision_customer")}</h2>
        <p className="text-subtle text-xs">{t("provision_customer_description")}</p>
      </div>

      <Form form={form} className="stack-y-4" handleSubmit={(values) => mutation.mutate(values)}>
        <TextField label={t("name")} required {...form.register("name")} />
        <TextField label={t("slug")} required {...form.register("slug")} />
        <EmailField label={t("org_owner_email")} required {...form.register("orgOwnerEmail")} />
        <TextField label={t("event_title")} required {...form.register("eventTitle")} />
        <TextField
          type="number"
          label={t("event_duration_minutes")}
          required
          {...form.register("eventLength", { valueAsNumber: true })}
        />
        <Button type="submit" loading={mutation.isPending}>
          {t("provision_customer")}
        </Button>
      </Form>

      {result && (
        <div className="bg-subtle stack-y-3 rounded-md p-4">
          <div>
            <Label>{t("booking_url")}</Label>
            <a
              href={result.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="block break-all text-sm text-blue-600 underline">
              {result.bookingUrl}
            </a>
          </div>
          <OrgEmbedSnippet slug={result.slug} initialPath={result.bookingPath} />
        </div>
      )}
    </div>
  );
}

export default ProvisionCustomerForm;
