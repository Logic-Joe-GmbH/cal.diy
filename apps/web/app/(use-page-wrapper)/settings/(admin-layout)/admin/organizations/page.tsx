import SettingsHeader from "@calcom/features/settings/appDir/SettingsHeader";
import { _generateMetadata, getTranslate } from "app/_utils";
import AdminOrganizationsView from "~/organizations/views/admin-organizations-view";

export const generateMetadata = async () =>
  await _generateMetadata(
    (t) => t("organizations"),
    (t) => t("admin_organizations_description"),
    undefined,
    undefined,
    "/settings/admin/organizations"
  );

const Page = async () => {
  const t = await getTranslate();

  return (
    <SettingsHeader title={t("organizations")} description={t("admin_organizations_description")}>
      <AdminOrganizationsView />
    </SettingsHeader>
  );
};

export default Page;
