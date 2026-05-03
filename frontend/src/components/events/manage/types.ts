export const MANAGE_TABS = ["overview", "audience", "tickets", "messaging", "settings"] as const;
export type ManageTab = (typeof MANAGE_TABS)[number];

export function normalizeManageTab(tab: string | null): ManageTab {
  if (tab && MANAGE_TABS.includes(tab as ManageTab)) return tab as ManageTab;
  return "overview";
}
