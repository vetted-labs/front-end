import { Suspense } from "react";
import { GuildDetailView } from "@/components/GuildDetailView";

interface GuildPageProps {
  params: Promise<{
    guildId: string;
  }>;
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading guild...</div>}>
      <GuildDetailView guildId={guildId} />
    </Suspense>
  );
}
