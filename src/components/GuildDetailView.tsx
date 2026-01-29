"use client";

import { useState, useEffect } from "react";
import { ExpertNavbar } from "@/components/ExpertNavbar";
import { useAccount } from "wagmi";
import { FileText, Briefcase, Coins, Trophy, UserPlus, Activity, Users, Home, Eye } from "lucide-react";
import { LoadingState } from "./ui/loadingstate";
import { Alert } from "./ui/alert";
import { useRouter } from "next/navigation";
import { expertApi } from "@/lib/api";
import { GuildHeader } from "./guild/GuildHeader";
import { GuildProposalsTab } from "./guild/GuildProposalsTab";
import { GuildLeaderboardTab } from "./guild/GuildLeaderboardTab";
import { GuildJobApplicationsTab } from "./guild/GuildJobApplicationsTab";
import { GuildMembershipApplicationsTab } from "./guild/GuildMembershipApplicationsTab";
import { GuildEarningsTab } from "./guild/GuildEarningsTab";
import { GuildActivityTab } from "./guild/GuildActivityTab";
import { GuildMembersTab } from "./guild/GuildMembersTab";
import { GuildJobsTab } from "./guild/GuildJobsTab";
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
  rankChange?: number; // Positive = moved up, negative = moved down
  reputationChange?: number; // Change in reputation this period
}

interface Activity {
  id: string;
  type: "proposal_submitted" | "candidate_approved" | "job_posted" | "endorsement_given";
  actor: string;
  target?: string;
  timestamp: string;
  details: string;
}

interface ExpertMember {
  id: string;
  fullName: string;
  email: string;
  walletAddress: string;
  role: "recruit" | "craftsman" | "master";
  reputation: number;
  expertise: string[];
  totalReviews: number;
  successRate: number;
  joinedAt: string;
}

interface CandidateMember {
  id: string;
  fullName: string;
  email: string;
  headline: string;
  experienceLevel: string;
  reputation: number;
  endorsements: number;
  joinedAt: string;
}

interface Job {
  id: string;
  title: string;
  location: string;
  type: string;
  salary: {
    min: number | null;
    max: number | null;
    currency: string;
  };
  applicants: number;
  createdAt: string;
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
  recentActivity: Activity[];
  experts: ExpertMember[];
  candidates: CandidateMember[];
  recentJobs: Job[];
  totalProposalsReviewed: number;
  averageApprovalTime: string;
  candidateCount: number;
  openPositions: number;
}

interface GuildDetailViewProps {
  guildId: string;
}

export function GuildDetailView({ guildId }: GuildDetailViewProps) {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "activity" | "members" | "jobs" | "leaderboard" | "reviews" | "membershipApplications" | "applications" | "earnings"
  >("overview");

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
      // Generate 30 experts with realistic progression
      const firstNames = ["Alex", "Sarah", "Marcus", "Emily", "David", "Jessica", "Michael", "Olivia", "Daniel", "Sophia",
                          "James", "Emma", "Robert", "Ava", "William", "Isabella", "Richard", "Mia", "Thomas", "Charlotte",
                          "Christopher", "Amelia", "Matthew", "Harper", "Anthony", "Evelyn", "Mark", "Abigail", "Donald", "Emily"];
      const lastNames = ["Morgan", "Chen", "Johnson", "Rodriguez", "Kim", "Williams", "Brown", "Davis", "Garcia", "Miller",
                         "Wilson", "Martinez", "Anderson", "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson", "Thompson",
                         "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark", "Lewis", "Robinson", "Walker", "Perez"];

      const roles: ("recruit" | "craftsman" | "master")[] = ["master", "master", "master", "craftsman", "craftsman"];

      const topExperts = Array.from({ length: 30 }, (_, i) => {
        // Reputation decreases more realistically as rank increases
        const baseReputation = 950 - (i * 25) - Math.floor(Math.random() * 15);
        const reputation = Math.max(100, baseReputation);

        // Reviews correlate with reputation
        const totalReviews = Math.max(10, 142 - (i * 3) - Math.floor(Math.random() * 10));

        // Accuracy stays high but varies
        const accuracy = Math.max(75, 94 - Math.floor(i / 2) - Math.floor(Math.random() * 5));

        // Earnings correlate with reputation and reviews
        const totalEarnings = Math.max(1000, Math.floor(reputation * 25) + Math.floor(Math.random() * 2000));

        // Determine role based on rank and reputation
        let role: "recruit" | "craftsman" | "master";
        if (i < 3) role = "master";
        else if (i < 12) role = "craftsman";
        else if (i < 20) role = Math.random() > 0.5 ? "craftsman" : "recruit";
        else role = "recruit";

        // Add rank changes for top 10 and some others
        let rankChange: number | undefined;
        if (i < 10) {
          // Top 10 more likely to have rank changes
          const changeChance = Math.random();
          if (changeChance > 0.3) {
            rankChange = Math.floor(Math.random() * 7) - 3; // -3 to +3
          }
        } else if (Math.random() > 0.8) {
          // Others have occasional changes
          rankChange = Math.floor(Math.random() * 5) - 2; // -2 to +2
        }

        // Add reputation changes
        let reputationChange: number | undefined;
        if (Math.random() > 0.4) {
          reputationChange = Math.floor(Math.random() * 40) - 15; // -15 to +24
        }

        return {
          id: `expert-${i + 1}`,
          name: `${firstNames[i]} ${lastNames[i]}`,
          role,
          reputation,
          totalReviews,
          accuracy,
          totalEarnings,
          rank: i + 1,
          rankChange,
          reputationChange,
        };
      });

      const mockLeaderboard = {
        topExperts,
        currentUser: {
          id: address,
          name: "You",
          role: guild?.expertRole as "recruit" | "craftsman" | "master",
          reputation: guild?.reputation || 0,
          totalReviews: 45,
          accuracy: 87,
          totalEarnings: guild?.earnings.totalEndorsementEarnings || 0,
          rank: 35,
          rankChange: 2, // User moved up 2 positions
          reputationChange: 12, // User gained 12 reputation
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

      {/* Navigation Link to Public View */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <button
          onClick={() => router.push(`/guilds/${guildId}`)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-card border border-border rounded-lg hover:border-primary/50 hover:shadow-md transition-all"
        >
          <Eye className="w-4 h-4" />
          View Public Guild Page
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {/* Tabs */}
        <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
          <div className="flex border-b border-border overflow-x-auto">
            <button
              onClick={() => setActiveTab("overview")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "overview"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Home className="w-4 h-4 inline mr-2" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "activity"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Activity
            </button>
            <button
              onClick={() => setActiveTab("members")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "members"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Members
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "jobs"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Jobs
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
              onClick={() => setActiveTab("reviews")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === "reviews"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Reviews
              {guild && guild.proposals.pending.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-semibold rounded-full">
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
              Membership Apps
              {guild && guild.guildApplications && guild.guildApplications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-semibold rounded-full">
                  {guild.guildApplications.length}
                </span>
              )}
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
              Job Apps
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
            {activeTab === "overview" && (
              <div className="space-y-6">
                <div className="text-center py-12">
                  <h3 className="text-2xl font-bold text-foreground mb-4">
                    Welcome to {guild.name}
                  </h3>
                  <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                    {guild.description}
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-3xl font-bold text-primary mb-1">
                        {guild.totalProposalsReviewed || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Proposals Reviewed</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-3xl font-bold text-primary mb-1">
                        {guild.averageApprovalTime || "N/A"}
                      </p>
                      <p className="text-sm text-muted-foreground">Avg Approval Time</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-3xl font-bold text-primary mb-1">
                        {guild.candidateCount || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Active Candidates</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4">
                      <p className="text-3xl font-bold text-primary mb-1">
                        {guild.openPositions || 0}
                      </p>
                      <p className="text-sm text-muted-foreground">Open Positions</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <GuildActivityTab activities={guild.recentActivity || []} />
            )}

            {activeTab === "members" && (
              <GuildMembersTab
                experts={guild.experts || []}
                candidates={guild.candidates || []}
              />
            )}

            {activeTab === "jobs" && (
              <GuildJobsTab
                jobs={guild.recentJobs || []}
                guildName={guild.name}
              />
            )}

            {activeTab === "leaderboard" && (
              <GuildLeaderboardTab
                leaderboardData={leaderboardData}
                leaderboardPeriod={leaderboardPeriod}
                onPeriodChange={setLeaderboardPeriod}
              />
            )}

            {activeTab === "reviews" && (
              <GuildProposalsTab
                proposals={guild.proposals}
                onStakeProposal={handleStakeOnProposal}
              />
            )}

            {activeTab === "membershipApplications" && (
              <GuildMembershipApplicationsTab
                guildName={guild.name}
                guildApplications={guild.guildApplications}
                onReviewApplication={handleReviewApplication}
              />
            )}

            {activeTab === "applications" && (
              <GuildJobApplicationsTab
                applications={guild.applications}
                onEndorseCandidate={handleEndorseCandidate}
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
