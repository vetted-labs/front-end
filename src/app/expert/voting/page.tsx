import { Suspense } from "react";
import VotingPage from "@/components/expert/VotingPage";

export default function Page() {
  return (
    <Suspense>
      <VotingPage />
    </Suspense>
  );
}
