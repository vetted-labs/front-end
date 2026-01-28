import { ExpertPublicProfileView } from "@/components/ExpertPublicProfileView";

export default async function ExpertPublicProfilePage({
  params,
}: {
  params: Promise<{ walletAddress: string }>;
}) {
  const { walletAddress } = await params;

  return <ExpertPublicProfileView walletAddress={walletAddress} />;
}
