export interface RTab {
  key: string;
  hrefSuffix: string;
  label: string;
  emoji: string;
  matchPrefix: string;
  exact?: boolean;
}

export const R_TABS: RTab[] = [
  { key: "dashboard", hrefSuffix: "", label: "Dashboard", emoji: "🏠", matchPrefix: "", exact: true },
  { key: "benevoles", hrefSuffix: "/benevoles", label: "Bénévoles", emoji: "👥", matchPrefix: "/benevoles" },
  { key: "applications", hrefSuffix: "/applications", label: "Candidatures", emoji: "📥", matchPrefix: "/applications" },
  { key: "planning", hrefSuffix: "/planning", label: "Planning", emoji: "📅", matchPrefix: "/planning" },
  { key: "safer", hrefSuffix: "/safer", label: "Safer", emoji: "🛟", matchPrefix: "/safer" },
  { key: "chat", hrefSuffix: "/chat", label: "Chat", emoji: "💬", matchPrefix: "/chat" },
];
