"use client";

import { useState, useEffect } from "react";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { useAccount } from "wagmi";
import { FileText, Briefcase, Coins, Trophy, UserPlus } from "lucide-react";
import { LoadingState } from "./ui/loadingstate";
import { Alert } from "./ui/alert";
import { expertApi } from "@/lib/api";
import { GuildHeader } from "./guild/GuildHeader";
import { GuildProposalsTab } from "./guild/GuildProposalsTab";
import { GuildLeaderboardTab } from "./guild/GuildLeaderboardTab";
import { GuildJobApplicationsTab } from "./guild/GuildJobApplicationsTab";
import { GuildMembershipApplicationsTab } from "./guild/GuildMembershipApplicationsTab";
import { GuildEarningsTab } from "./guild/GuildEarningsTab";
import { StakeModal } from "./guild/StakeModal";
import { ReviewGuildApplicationModal } from "./guild/ReviewGuildApplicationModal";

interface Proposal {
  id: string;
  candidateName: string;
  candidateEmail: string;
  submittedAt: string;
  status: "pending" | "ongoing" | "closed";
  requiredStake: number;
  participantCount: number;
  votesFor: number;
  votesAgainst: number;
  expertHasStaked: boolean;
}

interface JobApplication {
  id: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail: string;
  appliedAt: string;
  matchScore: number;
  reviewedByRecruiter: boolean;
  endorsementCount: number;
  applicationSummary: string;
}

interface Earnings {
  totalPoints: number;
  totalEndorsementEarnings: number;
  recentEarnings: Array<{
    id: string;
    type: "proposal" | "endorsement";
    amount: number;
    description: string;
    date: string;
  }>;
}

interface GuildApplication {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  linkedinUrl: string;
  portfolioUrl?: string;
  expertiseLevel: string;
  yearsOfExperience: number;
  currentTitle: string;
  currentCompany: string;
  bio: string;
  motivation: string;
  expertiseAreas: string[];
  appliedAt: string;
  reviewCount: number;
  approvalCount: number;
  rejectionCount: number;
}

interface LeaderboardExpert {
  id: string;
  name: string;
  role: "recruit" | "craftsman" | "master";
  reputation: number;
  totalReviews: number;
  accuracy: number;
  totalEarnings: number;
  rank: number;
}

interface GuildDetail {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  expertRole: string;
  reputation: number;
  proposals: {
    pending: Proposal[];
    ongoing: Proposal[];
    closed: Proposal[];
  };
  applications: JobApplication[];
  guildApplications: GuildApplication[];
  earnings: Earnings;
}

interface GuildDetailViewProps {
  guildId: string;
}

export function GuildDetailView({ guildId }: GuildDetailViewProps) {
  const { address, isConnected } = useAccount();
  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "reviews" | "applications" | "membershipApplications" | "leaderboard" | "earnings"
  >("reviews");

  // Stake modal state
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);

  // Review modal state
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedGuildApplication, setSelectedGuildApplication] =
    useState<GuildApplication | null>(null);
  const [reviewVote, setReviewVote] = useState<"approve" | "reject">("approve");
  const [reviewConfidence, setReviewConfidence] = useState("3");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Leaderboard state
  const [leaderboardData, setLeaderboardData] = useState<{
    topExperts: LeaderboardExpert[];
    currentUser: LeaderboardExpert | null;
  }>({ topExperts: [], currentUser: null });
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<"all" | "month" | "week">("all");

  useEffect(() => {
    if (isConnected && address) {
      fetchGuildDetails();
    }
  }, [guildId, isConnected, address]);

  useEffect(() => {
    if (isConnected && address && activeTab === "leaderboard" && guild) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, leaderboardPeriod, isConnected, address, guild]);

  const fetchGuildDetails = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const result: any = await expertApi.getGuildDetails(guildId, address);
      const data = result.data || result;
      setGuild(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch guild details");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    if (!address) return;

    try {
      // Mock leaderboard data - replace with actual API call
      const mockLeaderboard = {
        topExperts: [
          {
            id: "1",
            name: "Alex Morgan",
            role: "master" as const,
            reputation: 950,
            totalReviews: 142,
            accuracy: 94,
            totalEarnings: 25800,
            rank: 1,
          },
          {
            id: "2",
            name: "Sarah Chen",
            role: "craftsman" as const,
            reputation: 875,
            totalReviews: 98,
            accuracy: 92,
            totalEarnings: 18500,
            rank: 2,
          },
          {
            id: "3",
            name: "Marcus Johnson",
            role: "craftsman" as const,
            reputation: 820,
            totalReviews: 87,
            accuracy: 89,
            totalEarnings: 16200,
            rank: 3,
          },
          {
            id: "4",
            name: "Emily Rodriguez",
            role: "craftsman" as const,
            reputation: 785,
            totalReviews: 76,
            accuracy: 91,
            totalEarnings: 14900,
            rank: 4,
          },
          {
            id: "5",
            name: "David Kim",
            role: "recruit" as const,
            reputation: 720,
            totalReviews: 65,
            accuracy: 88,
            totalEarnings: 12300,
            rank: 5,
          },
        ],
        currentUser: {
          id: address,
          name: "You",
          role: guild?.expertRole as "recruit" | "craftsman" | "master",
          reputation: guild?.reputation || 0,
          totalReviews: 45,
          accuracy: 87,
          totalEarnings: guild?.earnings.totalEndorsementEarnings || 0,
          rank: 8,
        },
      };
      setLeaderboardData(mockLeaderboard);
    } catch (err: any) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

  const handleStakeOnProposal = (proposal: Proposal) => {
    setSelectedProposal(proposal);
    setStakeAmount(proposal.requiredStake.toString());
    setShowStakeModal(true);
  };

  const handleConfirmStake = async () => {
    if (!selectedProposal || !address) return;

    setIsStaking(true);

    try {
      await expertApi.stakeOnProposal(selectedProposal.id, {
        walletAddress: address,
        stakeAmount: parseFloat(stakeAmount),
      });

      setShowStakeModal(false);
      setSelectedProposal(null);
      fetchGuildDetails();
    } catch (err: any) {
      setError(err.message || "Failed to stake on proposal");
    } finally {
      setIsStaking(false);
    }
  };

  const handleEndorseCandidate = async (applicationId: string, endorse: boolean) => {
    if (!address) return;

    try {
      await expertApi.endorseApplication(applicationId, {
        walletAddress: address,
        endorse,
      });

      fetchGuildDetails();
    } catch (err: any) {
      setError(err.message || "Failed to endorse candidate");
    }
  };

  const handleReviewApplication = (application: GuildApplication) => {
    setSelectedGuildApplication(application);
    setReviewVote("approve");
    setReviewConfidence("3");
    setReviewFeedback("");
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedGuildApplication || !address) return;

    setIsReviewing(true);

    try {
      await expertApi.reviewGuildApplication(selectedGuildApplication.id, {
        walletAddress: address,
        vote: reviewVote,
        confidenceLevel: parseInt(reviewConfidence),
        feedback: reviewFeedback || undefined,
      });

      setShowReviewModal(false);
      setSelectedGuildApplication(null);
      fetchGuildDetails();
    } catch (err: any) {
      setError(err.message || "Failed to submit review");
    } finally {
      setIsReviewing(false);
    }
  };

  if (isLoading) {
    return <LoadingState message="Loading guild details..." />;
  }

  if (error || !guild) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Alert variant="error">{error || "Failed to load guild details"}</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      <ExpertNavbar />

      <GuildHeader guild={guild} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
          <div className="flex border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "reviews"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Candidate Reviews
              {guild && guild.proposals.pending.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {guild.proposals.pending.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("membershipApplications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "membershipApplications"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              Membership Applications
              {guild && guild.guildApplications && guild.guildApplications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {guild.guildApplications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("leaderboard")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "leaderboard"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Trophy className="w-4 h-4 inline mr-2" />
              Leaderboard
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "applications"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Job Applications
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "earnings"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Coins className="w-4 h-4 inline mr-2" />
              Earnings
            </button>
          </div>

          <div className="p-6">
            {activeTab === "reviews" && (
              <GuildProposalsTab
                proposals={guild.proposals}
                onStakeProposal={handleStakeOnProposal}
              />
            )}

            {activeTab === "leaderboard" && (
              <GuildLeaderboardTab
                leaderboardData={leaderboardData}
                leaderboardPeriod={leaderboardPeriod}
                onPeriodChange={setLeaderboardPeriod}
              />
            )}

            {activeTab === "applications" && (
              <GuildJobApplicationsTab
                applications={guild.applications}
                onEndorseCandidate={handleEndorseCandidate}
              />
            )}

            {activeTab === "membershipApplications" && (
              <GuildMembershipApplicationsTab
                guildName={guild.name}
                guildApplications={guild.guildApplications}
                onReviewApplication={handleReviewApplication}
              />
            )}

            {activeTab === "earnings" && (
              <GuildEarningsTab earnings={guild.earnings} />
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <StakeModal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        proposal={selectedProposal}
        stakeAmount={stakeAmount}
        onStakeAmountChange={setStakeAmount}
        onConfirmStake={handleConfirmStake}
        isStaking={isStaking}
      />

      <ReviewGuildApplicationModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        application={selectedGuildApplication}
        reviewVote={reviewVote}
        onVoteChange={setReviewVote}
        reviewConfidence={reviewConfidence}
        onConfidenceChange={setReviewConfidence}
        reviewFeedback={reviewFeedback}
        onFeedbackChange={setReviewFeedback}
        onSubmitReview={handleSubmitReview}
        isReviewing={isReviewing}
      />
    </div>
  );
}
