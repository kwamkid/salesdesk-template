import { Tabs } from "@/components/ui/tabs";
import { MENU_ICON, MetaIcon } from "@/lib/icons";

export type SettingsTab = "projects" | "users" | "company" | "meta";

const ProjectIcon = MENU_ICON.building;
const UsersIcon = MENU_ICON.users;
const CompanyIcon = MENU_ICON.file;

/** Tabs across the admin's settings: each tab is its own page (/projects, /users, /settings?tab=…). */
export function SettingsTabs({ active }: { active: SettingsTab }) {
  return (
    <Tabs
      activeKey={active}
      className="mb-0"
      tabs={[
        {
          key: "projects",
          label: "โครงการ",
          href: "/projects",
          icon: <ProjectIcon className="h-4 w-4" aria-hidden />,
        },
        {
          key: "users",
          label: "พนักงาน",
          href: "/users",
          icon: <UsersIcon className="h-4 w-4" aria-hidden />,
        },
        {
          key: "company",
          label: "บริษัท",
          href: "/settings?tab=company",
          icon: <CompanyIcon className="h-4 w-4" aria-hidden />,
        },
        {
          key: "meta",
          label: "Meta",
          href: "/settings?tab=meta",
          icon: <MetaIcon className="h-4 w-4" aria-hidden />,
        },
      ]}
    />
  );
}
