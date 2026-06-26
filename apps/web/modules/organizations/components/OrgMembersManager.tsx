"use client";

import { useLocale } from "@calcom/lib/hooks/useLocale";
import { trpc } from "@calcom/trpc/react";
import { Button } from "@calcom/ui/components/button";
import { EmailField, Form, Label } from "@calcom/ui/components/form";
import { showToast } from "@calcom/ui/components/toast";
import { useState } from "react";
import { useForm } from "react-hook-form";

type InviteFormValues = {
  email: string;
  role: "MEMBER" | "ADMIN";
};

type MemberRole = "MEMBER" | "ADMIN" | "OWNER";

export function OrgMembersManager({ organizationId }: { organizationId: number }) {
  const { t } = useLocale();
  const utils = trpc.useUtils();
  const membersQuery = trpc.viewer.admin.listOrganizationMembers.useQuery({ organizationId });
  const members = membersQuery.data ?? [];

  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const inviteForm = useForm<InviteFormValues>({ defaultValues: { email: "", role: "MEMBER" } });

  const invalidate = async () => {
    await utils.viewer.admin.listOrganizationMembers.invalidate({ organizationId });
    await utils.viewer.admin.listOrganizations.invalidate();
  };

  const inviteMutation = trpc.viewer.admin.inviteOrganizationMember.useMutation({
    onSuccess: async (result) => {
      showToast(
        result.status === "invited" ? t("invitation_sent") : t("member_added_successfully"),
        "success"
      );
      setInviteLink(result.inviteLink);
      inviteForm.reset({ email: "", role: "MEMBER" });
      await invalidate();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const roleMutation = trpc.viewer.admin.updateOrganizationMemberRole.useMutation({
    onSuccess: async () => {
      showToast(t("member_updated_successfully"), "success");
      await invalidate();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const removeMutation = trpc.viewer.admin.removeOrganizationMember.useMutation({
    onSuccess: async () => {
      showToast(t("member_removed_successfully"), "success");
      await invalidate();
    },
    onError: (err) => showToast(err.message, "error"),
  });

  const copyInviteLink = async () => {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    showToast(t("copied"), "success");
  };

  return (
    <div className="border-subtle stack-y-4 rounded-md border p-6">
      <h2 className="text-emphasis text-base font-semibold">{t("members")}</h2>

      <Form
        form={inviteForm}
        className="flex items-end gap-2"
        handleSubmit={(values) => inviteMutation.mutate({ organizationId, ...values })}>
        <div className="flex-1">
          <EmailField label={t("invite_member")} required {...inviteForm.register("email")} />
        </div>
        <div>
          <Label>{t("role")}</Label>
          <select
            className="border-default bg-default text-default block rounded-md text-sm"
            {...inviteForm.register("role")}>
            <option value="MEMBER">{t("member")}</option>
            <option value="ADMIN">{t("administrator")}</option>
          </select>
        </div>
        <Button type="submit" color="secondary" loading={inviteMutation.isPending}>
          {t("send_invite")}
        </Button>
      </Form>

      {inviteLink && (
        <div className="bg-subtle stack-y-2 rounded-md p-4">
          <Label>{t("invite_link")}</Label>
          <p className="text-subtle text-xs">{t("share_invite_link_description")}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              className="border-default bg-default text-default block w-full rounded-md text-xs"
              value={inviteLink}
            />
            <Button type="button" color="secondary" onClick={copyInviteLink}>
              {t("copy")}
            </Button>
          </div>
        </div>
      )}

      {members.length > 0 ? (
        <ul className="border-subtle divide-subtle divide-y rounded-md border">
          {members.map((member) => (
            <li key={member.userId} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="text-emphasis truncate text-sm font-medium">
                  {member.name || member.username || member.email}
                </p>
                <p className="text-subtle truncate text-xs">
                  {member.email}
                  {!member.accepted && ` · ${t("pending")}`}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <select
                  className="border-default bg-default text-default block rounded-md text-sm"
                  value={member.role}
                  disabled={roleMutation.isPending}
                  onChange={(event) =>
                    roleMutation.mutate({
                      organizationId,
                      userId: member.userId,
                      role: event.target.value as MemberRole,
                    })
                  }>
                  <option value="MEMBER">{t("member")}</option>
                  <option value="ADMIN">{t("administrator")}</option>
                  <option value="OWNER">{t("owner")}</option>
                </select>
                <Button
                  color="destructive"
                  loading={removeMutation.isPending}
                  onClick={() => removeMutation.mutate({ organizationId, userId: member.userId })}>
                  {t("remove")}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-subtle text-sm">{membersQuery.isPending ? t("loading") : t("no_members_found")}</p>
      )}
    </div>
  );
}

export default OrgMembersManager;
