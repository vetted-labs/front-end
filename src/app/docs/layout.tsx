import type { Metadata } from "next";
import { DocsChrome } from "@/components/docs/DocsChrome";

export const metadata: Metadata = {
  title: {
    default: "Docs — Vetted",
    template: "%s — Vetted Docs",
  },
  description:
    "Documentation and guides for Vetted — the decentralized hiring platform where guilds of experts vet candidates on-chain.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <DocsChrome>{children}</DocsChrome>;
}
