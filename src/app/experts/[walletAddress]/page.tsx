import { ExpertProfile } from "@/components/ExpertProfile";

export default async function ExpertPublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress } = await params;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <ExpertProfile walletAddress={walletAddress} showBackButton />
    </div>
  );
}
