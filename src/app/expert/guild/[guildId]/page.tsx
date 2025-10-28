import { GuildDetailView } from "@/components/GuildDetailView";

interface GuildPageProps {
  params: Promise<{
    guildId: string;
  }>;
}

export default async function GuildPage({ params }: GuildPageProps) {
  const { guildId } = await params;

  return <GuildDetailView guildId={guildId} />;
}
