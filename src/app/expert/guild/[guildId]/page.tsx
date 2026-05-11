import { Suspense } from "react";
import { GuildWorkspacePage } from "@/components/guild/GuildWorkspacePage";

interface GuildPageProps {
  params: Promise<{
    guildId: string;
  }>;
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          Loading workspace…
        </div>
      }
    >
      <GuildWorkspacePage guildId={guildId} />
    </Suspense>
  );
}
