"use client";
import { EndorsementBiddingUI } from "@/components/EndorsementBiddingUI";

// Mock data for demonstration
const mockApplications = [
  {
    id: "1",
    jobTitle: "Senior Frontend Developer",
    companyName: "TechCorp",
    candidateName: "Alice Johnson",
    matchScore: 95,
    currentEndorsements: [
      { expertName: "John Doe", bidAmount: 150, rank: 1, expertReputation: 450 },
      { expertName: "Jane Smith", bidAmount: 120, rank: 2, expertReputation: 380 },
    ],
    minimumBid: 100,
    rewardPool: 600,
    applicationSummary: "10+ years React, TypeScript, Next.js experience. Strong portfolio.",
  },
  {
    id: "2",
    jobTitle: "Product Manager",
    companyName: "StartupXYZ",
    candidateName: "Bob Williams",
    matchScore: 88,
    currentEndorsements: [
      { expertName: "Sarah Lee", bidAmount: 200, rank: 1, expertReputation: 520 },
      { expertName: "Mike Chen", bidAmount: 180, rank: 2, expertReputation: 410 },
      { expertName: "Emma Davis", bidAmount: 160, rank: 3, expertReputation: 350 },
    ],
    minimumBid: 100,
    rewardPool: 900,
    applicationSummary: "Product leader with 8 years exp. Led 3 successful product launches.",
  },
  {
    id: "3",
    jobTitle: "Smart Contract Developer",
    companyName: "DeFi Protocol",
    candidateName: "Carlos Martinez",
    matchScore: 92,
    currentEndorsements: [],
    minimumBid: 150,
    rewardPool: 1200,
    applicationSummary: "Solidity expert, audited 50+ contracts, Web3 native.",
  },
];

export default function EndorsementsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      <EndorsementBiddingUI
        applications={mockApplications}
        expertTokenBalance={1500}
        expertReputation={425}
      />
    </div>
  );
}
