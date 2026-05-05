export interface RegieTab {
  key: string;
  hrefSuffix: string;
  label: string;
  emoji: string;
  matchPrefix: string;
  exact?: boolean;
}

export const REGIE_TABS: RegieTab[] = [
  { key: "dashboard", hrefSuffix: "", label: "Dashboard", emoji: "🏠", matchPrefix: "", exact: true },
  { key: "applications", hrefSuffix: "/applications", label: "Candidatures", emoji: "📥", matchPrefix: "/applications" },
  { key: "planning", hrefSuffix: "/planning", label: "Planning", emoji: "📅", matchPrefix: "/planning" },
  { key: "sponsors", hrefSuffix: "/sponsors", label: "Sponsors", emoji: "🤝", matchPrefix: "/sponsors" },
  { key: "plan", hrefSuffix: "/plan", label: "Plan", emoji: "🗺️", matchPrefix: "/plan" },
  { key: "safer", hrefSuffix: "/safer", label: "Safer", emoji: "🛟", matchPrefix: "/safer" },
  { key: "messages", hrefSuffix: "/messages", label: "Diffusion", emoji: "📣", matchPrefix: "/messages" },
  { key: "chat", hrefSuffix: "/chat", label: "Chat", emoji: "💬", matchPrefix: "/chat" },
  { key: "theme", hrefSuffix: "/settings/theme", label: "Thème", emoji: "🎨", matchPrefix: "/settings/theme" },
];
