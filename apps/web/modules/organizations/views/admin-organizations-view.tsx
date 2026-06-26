"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmailField, Form, Label, TextField } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { OrgEmbedSnippet } from "~/organizations/components/OrgEmbedSnippet";
import { OrgMembersManager } from "~/organizations/components/OrgMembersManager";
import { OrgSettingsForm } from "~/organizations/components/OrgSettingsForm";
import { ProvisionCustomerForm } from "~/organizations/components/ProvisionCustomerForm";

type CreateOrgFormValues = {
  name: string;
  slug: string;
  orgOwnerEmail: string;
};

export default function AdminOrganizationsView() {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const createForm = useForm<CreateOrgFormValues>({
    defaultValues: { name: "", slug: "", orgOwnerEmail: "" },
  });

  const organizationsQuery = trpc.viewer.admin.listOrganizations.useQuery();
  const organizations = organizationsQuery.data ?? [];

  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);

  useEffect(() => {
    if (selectedOrgId === null && organizations.length > 0) {
      setSelectedOrgId(organizations[0].id);
    }
    // Reset selection if the selected org was deleted from the list.
    if (selectedOrgId !== null && !organizations.some((org) => org.id === selectedOrgId)) {
      setSelectedOrgId(organizations[0]?.id ?? null);
    }
  }, [organizations, selectedOrgId]);

  const createMutation = trpc.viewer.admin.createOrganization.useMutation({
    onSuccess: async () => {
      showToast(t("organization_created_successfully"), "success");
      createForm.reset();
      await utils.viewer.admin.listOrganizations.invalidate();
    },
    onError: (err) => {
      showToast(err.message, "error");
    },
  });

  return (
    <div className="stack-y-8">
      <ProvisionCustomerForm />

      <Form
        form={createForm}
        className="border-subtle stack-y-4 rounded-md border p-6"
        handleSubmit={(values) => createMutation.mutate(values)}>
        <h2 className="text-emphasis text-base font-semibold">{t("create")}</h2>
        <TextField label={t("name")} required {...createForm.register("name")} />
        <TextField label={t("slug")} required {...createForm.register("slug")} />
        <EmailField label={t("org_owner_email")} required {...createForm.register("orgOwnerEmail")} />
        <Button type="submit" loading={createMutation.isPending}>
          {t("create")}
        </Button>
      </Form>

      {organizations.length > 0 && selectedOrgId !== null && (
        <>
          <div>
            <Label>{t("organization")}</Label>
            <select
              className="border-default bg-default text-default block w-full rounded-md text-sm"
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(Number(event.target.value))}>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>

          <OrgSettingsForm key={`settings-${selectedOrgId}`} organizationId={selectedOrgId} />
          <OrgMembersManager key={`members-${selectedOrgId}`} organizationId={selectedOrgId} />
          <OrgEmbedSnippet
            key={`embed-${selectedOrgId}`}
            slug={organizations.find((org) => org.id === selectedOrgId)?.slug ?? null}
          />
        </>
      )}

      <div>
        <h2 className="text-emphasis mb-4 text-base font-semibold">{t("organizations")}</h2>
        {organizations.length > 0 ? (
          <ul className="border-subtle divide-subtle divide-y rounded-md border">
            {organizations.map((org) => (
              <li key={org.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-emphasis text-sm font-medium">{org.name}</p>
                  <p className="text-subtle text-xs">/{org.slug ?? "—"}</p>
                </div>
                <span className="text-subtle text-xs">{t("number_member", { count: org.memberCount })}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-subtle text-sm">{t("no_organizations_yet")}</p>
        )}
      </div>
    </div>
  );
}
