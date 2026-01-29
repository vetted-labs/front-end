import { ExpertProfile } from "@/components/ExpertProfile";

export default async function ExpertPublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress } = await params;

  return <ExpertProfile walletAddress={walletAddress} showBackButton />;
}
