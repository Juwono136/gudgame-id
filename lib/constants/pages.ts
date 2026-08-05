import { siteConfig } from "@/lib/config";

export const pageMeta = {
  players: {
    title: "Players",
    description:
      "Browse padel player profiles, skill tiers, tournament history, and performance stats.",
  },
  news: {
    title: "News",
    description:
      "Daily padel news, tournament announcements, and community updates.",
  },
  about: {
    title: "About",
    description: `Learn about ${siteConfig.name} — the modern sports encyclopedia built for court sports communities.`,
  },
  contact: {
    title: "Contact Us",
    description: `Reach the ${siteConfig.name} team for support, partnerships, and general inquiries.`,
  },
  privacy: {
    title: "Privacy Policy",
    description: `How ${siteConfig.name} collects, uses, and protects your personal information.`,
  },
  terms: {
    title: "Terms of Service",
    description: `The rules and conditions for using ${siteConfig.name}.`,
  },

  community: {
    title: "Community",
    description:
      "Connect with players, join clubs, and grow the padel ecosystem together.",
  },
  login: {
    title: "Sign In",
    description: `Access your ${siteConfig.name} account to contribute and track your progress.`,
  },
  register: {
    title: "Create Account",
    description: `Join ${siteConfig.name} to contribute wiki content, follow players, and join the community.`,
  },
} as const;
