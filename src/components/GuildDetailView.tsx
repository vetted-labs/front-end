"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import {
  ArrowLeft,
  Loader2,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Briefcase,
  Users,
  DollarSign,
  Coins,
  TrendingUp,
  Award,
  ThumbsUp,
  ThumbsDown,
  Lock,
  Unlock,
} from "lucide-react";
import { LoadingState } from "./ui/LoadingState";
import { Alert } from "./ui/Alert";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Input } from "./ui/Input";

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
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [guild, setGuild] = useState<GuildDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "proposals" | "applications" | "guildApplications" | "earnings"
  >("proposals");
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
  const [stakeAmount, setStakeAmount] = useState("");
  const [isStaking, setIsStaking] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedGuildApplication, setSelectedGuildApplication] =
    useState<GuildApplication | null>(null);
  const [reviewVote, setReviewVote] = useState<"approve" | "reject">("approve");
  const [reviewConfidence, setReviewConfidence] = useState("3");
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    if (isConnected && address) {
      fetchGuildDetails();
    }
  }, [guildId, isConnected, address]);

  const fetchGuildDetails = async () => {
    if (!address) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `http://localhost:4000/api/experts/guilds/${guildId}?wallet=${address}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch guild details");
      }

      const result = await response.json();
      const data = result.data || result; // Handle both wrapped and unwrapped responses
      setGuild(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
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
      const response = await fetch(
        `http://localhost:4000/api/experts/proposals/${selectedProposal.id}/stake`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,
            stakeAmount: parseFloat(stakeAmount),
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to stake on proposal");
      }

      setShowStakeModal(false);
      setSelectedProposal(null);
      fetchGuildDetails(); // Refresh data
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsStaking(false);
    }
  };

  const handleEndorseCandidate = async (applicationId: string, endorse: boolean) => {
    if (!address) return;

    try {
      const response = await fetch(
        `http://localhost:4000/api/experts/applications/${applicationId}/endorse`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,
            endorse,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to endorse candidate");
      }

      fetchGuildDetails(); // Refresh data
    } catch (err) {
      setError((err as Error).message);
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
      const response = await fetch(
        `http://localhost:4000/api/experts/guild-applications/${selectedGuildApplication.id}/review`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress: address,
            vote: reviewVote,
            confidenceLevel: parseInt(reviewConfidence),
            feedback: reviewFeedback || undefined,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit review");
      }

      setShowReviewModal(false);
      setSelectedGuildApplication(null);
      fetchGuildDetails(); // Refresh data
    } catch (err) {
      setError((err as Error).message);
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
        <Alert type="error">{error || "Failed to load guild details"}</Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <nav className="border-b border-slate-200 bg-white/95 backdrop-blur-sm sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={() => router.push("/expert/dashboard")}
              className="flex items-center text-slate-600 hover:text-slate-900 transition-all mr-6"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{guild.name}</h1>
              <p className="text-xs text-slate-500">{guild.memberCount} members</p>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Guild Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Your Role</p>
              <Award className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 capitalize">{guild.expertRole}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Reputation</p>
              <TrendingUp className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{guild.reputation}</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-600">Total Earnings</p>
              <DollarSign className="w-5 h-5 text-violet-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900">
              ${guild.earnings.totalEndorsementEarnings.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("proposals")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === "proposals"
                  ? "text-violet-600 border-b-2 border-violet-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Proposals
            </button>
            <button
              onClick={() => setActiveTab("applications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === "applications"
                  ? "text-violet-600 border-b-2 border-violet-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Briefcase className="w-4 h-4 inline mr-2" />
              Applications
            </button>
            <button
              onClick={() => setActiveTab("guildApplications")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === "guildApplications"
                  ? "text-violet-600 border-b-2 border-violet-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Guild Proposals
              {guild && guild.guildApplications && guild.guildApplications.length > 0 && (
                <span className="ml-2 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                  {guild.guildApplications.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-all ${
                activeTab === "earnings"
                  ? "text-violet-600 border-b-2 border-violet-600"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Coins className="w-4 h-4 inline mr-2" />
              Earnings
            </button>
          </div>

          <div className="p-6">
            {/* Proposals Tab */}
            {activeTab === "proposals" && (
              <div className="space-y-6">
                {/* Proposal Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-2xl font-bold text-yellow-700">
                      {guild.proposals.pending.length}
                    </p>
                    <p className="text-sm text-yellow-600 mt-1">Pending</p>
                  </div>
                  <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-2xl font-bold text-blue-700">
                      {guild.proposals.ongoing.length}
                    </p>
                    <p className="text-sm text-blue-600 mt-1">Ongoing</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-2xl font-bold text-green-700">
                      {guild.proposals.closed.length}
                    </p>
                    <p className="text-sm text-green-600 mt-1">Closed</p>
                  </div>
                </div>

                {/* Pending Proposals */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Pending Proposals - Stake to Participate
                  </h3>
                  {guild.proposals.pending.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                      No pending proposals at the moment
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {guild.proposals.pending.map((proposal) => (
                        <div
                          key={proposal.id}
                          className="border border-slate-200 rounded-lg p-4 hover:border-violet-300 transition-all"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {proposal.candidateName}
                              </h4>
                              <p className="text-sm text-slate-600 mb-2">
                                {proposal.candidateEmail}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-500">
                                <span className="flex items-center">
                                  <Clock className="w-3 h-3 mr-1" />
                                  {new Date(proposal.submittedAt).toLocaleDateString()}
                                </span>
                                <span className="flex items-center">
                                  <Lock className="w-3 h-3 mr-1" />
                                  Required: {proposal.requiredStake} tokens
                                </span>
                              </div>
                            </div>
                            {proposal.expertHasStaked ? (
                              <div className="flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-lg border border-green-200">
                                <Unlock className="w-4 h-4 mr-2" />
                                <span className="text-sm font-medium">Staked</span>
                              </div>
                            ) : (
                              <Button onClick={() => handleStakeOnProposal(proposal)}>
                                <Lock className="w-4 h-4 mr-2" />
                                Stake to Participate
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ongoing Proposals */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Ongoing Proposals
                  </h3>
                  {guild.proposals.ongoing.length === 0 ? (
                    <p className="text-slate-500 text-center py-8">
                      No ongoing proposals
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {guild.proposals.ongoing.map((proposal) => (
                        <div
                          key={proposal.id}
                          className="border border-blue-200 bg-blue-50 rounded-lg p-4"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 mb-1">
                                {proposal.candidateName}
                              </h4>
                              <p className="text-sm text-slate-600 mb-2">
                                {proposal.candidateEmail}
                              </p>
                              <div className="flex items-center gap-4 text-xs text-slate-600">
                                <span className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {proposal.participantCount} participants
                                </span>
                                <span className="flex items-center text-green-600">
                                  <ThumbsUp className="w-3 h-3 mr-1" />
                                  {proposal.votesFor}
                                </span>
                                <span className="flex items-center text-red-600">
                                  <ThumbsDown className="w-3 h-3 mr-1" />
                                  {proposal.votesAgainst}
                                </span>
                              </div>
                            </div>
                            <div className="text-xs text-blue-700 font-medium">
                              Under Review
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Applications Tab */}
            {activeTab === "applications" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Active Job Applications
                  </h3>
                  <p className="text-sm text-slate-600">
                    Review candidates and endorse those you believe are a good fit
                  </p>
                </div>

                {guild.applications.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">
                    No applications to review at the moment
                  </p>
                ) : (
                  guild.applications.map((application) => (
                    <div
                      key={application.id}
                      className="border border-slate-200 rounded-lg p-6 hover:border-violet-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900 mb-1">
                            {application.jobTitle}
                          </h4>
                          <p className="text-sm text-slate-600 mb-2">
                            {application.candidateName} • {application.candidateEmail}
                          </p>
                          <div className="flex items-center gap-4 text-xs text-slate-500 mb-3">
                            <span>Applied: {new Date(application.appliedAt).toLocaleDateString()}</span>
                            {!application.reviewedByRecruiter && (
                              <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-md border border-yellow-200">
                                Awaiting Recruiter Review
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-3xl font-bold text-violet-600 mb-1">
                            {application.matchScore}%
                          </div>
                          <p className="text-xs text-slate-500">Match Score</p>
                        </div>
                      </div>

                      <p className="text-sm text-slate-600 mb-4 pb-4 border-b border-slate-100">
                        {application.applicationSummary}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="text-sm text-slate-600">
                          {application.endorsementCount} endorsement(s)
                        </div>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => handleEndorseCandidate(application.id, false)}
                            variant="secondary"
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Pass
                          </Button>
                          <Button onClick={() => handleEndorseCandidate(application.id, true)}>
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Endorse
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Guild Proposals Tab - Layer 1: Expert proposals to join the guild */}
            {activeTab === "guildApplications" && (
              <div className="space-y-4">
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Expert Proposals to Join Guild
                  </h3>
                  <p className="text-sm text-slate-600">
                    Review proposals from experts wanting to join {guild.name}. 1+ approval
                    needed for auto-acceptance as "Recruit" member.
                  </p>
                </div>

                {!guild.guildApplications || guild.guildApplications.length === 0 ? (
                  <p className="text-slate-500 text-center py-12">
                    No pending guild proposals at the moment
                  </p>
                ) : (
                  (guild.guildApplications || []).map((application) => (
                    <div
                      key={application.id}
                      className="border border-slate-200 rounded-lg p-6 hover:border-violet-300 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-slate-900 mb-1">
                            {application.fullName}
                          </h4>
                          <p className="text-sm text-slate-600 mb-2">{application.email}</p>
                          <div className="flex items-center gap-3 mb-3">
                            <span className="px-3 py-1 bg-violet-100 text-violet-700 text-xs font-semibold rounded-full">
                              {application.expertiseLevel}
                            </span>
                            <span className="text-xs text-slate-500">
                              {application.yearsOfExperience} years experience
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-slate-500 mb-2">Review Status</p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="w-4 h-4 mr-1" />
                              <span className="text-sm font-semibold">
                                {application.approvalCount}
                              </span>
                            </div>
                            <div className="flex items-center text-red-600">
                              <XCircle className="w-4 h-4 mr-1" />
                              <span className="text-sm font-semibold">
                                {application.rejectionCount}
                              </span>
                            </div>
                            <span className="text-xs text-slate-500">
                              ({application.reviewCount} total)
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Current Position */}
                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-1">Current Position</p>
                        <p className="text-sm font-medium text-slate-900">
                          {application.currentTitle} at {application.currentCompany}
                        </p>
                      </div>

                      {/* Bio */}
                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-2">Bio</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{application.bio}</p>
                      </div>

                      {/* Motivation */}
                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-2">Motivation to Join</p>
                        <p className="text-sm text-slate-700 leading-relaxed">
                          {application.motivation}
                        </p>
                      </div>

                      {/* Expertise Areas */}
                      <div className="mb-4 pb-4 border-b border-slate-100">
                        <p className="text-xs text-slate-500 mb-2">Expertise Areas</p>
                        <div className="flex flex-wrap gap-2">
                          {(application.expertiseAreas || []).map((area, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-slate-100 text-slate-700 text-xs rounded-full"
                            >
                              {area}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Links */}
                      <div className="mb-4">
                        <div className="flex gap-4 text-sm">
                          <a
                            href={application.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-violet-600 hover:text-violet-700 underline"
                          >
                            LinkedIn Profile
                          </a>
                          {application.portfolioUrl && (
                            <a
                              href={application.portfolioUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-violet-600 hover:text-violet-700 underline"
                            >
                              Portfolio
                            </a>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">
                          Applied: {new Date(application.appliedAt).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Review Button */}
                      <Button
                        onClick={() => handleReviewApplication(application)}
                        className="w-full"
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Review Application
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Earnings Tab */}
            {activeTab === "earnings" && (
              <div className="space-y-6">
                {/* Earnings Summary */}
                <div className="grid md:grid-cols-2 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-xl p-6 border border-violet-200">
                    <div className="flex items-center justify-between mb-4">
                      <Coins className="w-10 h-10 text-violet-600" />
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-sm text-slate-600 mb-1">Total Points Earned</p>
                    <p className="text-3xl font-bold text-slate-900">
                      {guild.earnings.totalPoints.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      From proposal participation
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                    <div className="flex items-center justify-between mb-4">
                      <DollarSign className="w-10 h-10 text-green-600" />
                      <TrendingUp className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-sm text-slate-600 mb-1">Endorsement Earnings</p>
                    <p className="text-3xl font-bold text-slate-900">
                      ${guild.earnings.totalEndorsementEarnings.toLocaleString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-2">
                      From successful endorsements
                    </p>
                  </div>
                </div>

                {/* Recent Earnings */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">
                    Recent Earnings History
                  </h3>
                  {guild.earnings.recentEarnings.length === 0 ? (
                    <p className="text-slate-500 text-center py-12">
                      No earnings yet. Start reviewing proposals and endorsing candidates!
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {guild.earnings.recentEarnings.map((earning) => (
                        <div
                          key={earning.id}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg"
                        >
                          <div className="flex items-center">
                            {earning.type === "proposal" ? (
                              <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center mr-4">
                                <FileText className="w-5 h-5 text-violet-600" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-4">
                                <Award className="w-5 h-5 text-green-600" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">
                                {earning.description}
                              </p>
                              <p className="text-xs text-slate-500">
                                {new Date(earning.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-semibold text-green-600">
                              {earning.type === "proposal"
                                ? `+${earning.amount} pts`
                                : `+$${earning.amount}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stake Modal */}
      <Modal
        isOpen={showStakeModal}
        onClose={() => setShowStakeModal(false)}
        title="Stake on Proposal"
      >
        {selectedProposal && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Candidate</p>
              <p className="font-semibold text-slate-900">{selectedProposal.candidateName}</p>
            </div>

            <Input
              label="Stake Amount (tokens)"
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              min={selectedProposal.requiredStake}
              required
            />

            <Alert type="info">
              By staking, you'll be able to participate in reviewing this proposal. Your stake
              will be returned after the review, with rewards if you vote with the majority.
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowStakeModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirmStake}
                disabled={isStaking}
                className="flex-1"
              >
                {isStaking ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Staking...
                  </>
                ) : (
                  <>
                    <Lock className="mr-2 w-4 h-4" />
                    Confirm Stake
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        title="Review Expert Application"
      >
        {selectedGuildApplication && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-sm text-slate-600 mb-1">Applicant</p>
              <p className="font-semibold text-slate-900">
                {selectedGuildApplication.fullName}
              </p>
              <p className="text-xs text-slate-500">{selectedGuildApplication.email}</p>
            </div>

            {/* Vote Selection */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Your Vote
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setReviewVote("approve")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reviewVote === "approve"
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:border-green-300"
                  }`}
                >
                  <ThumbsUp
                    className={`w-6 h-6 mx-auto mb-2 ${
                      reviewVote === "approve" ? "text-green-600" : "text-slate-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      reviewVote === "approve" ? "text-green-700" : "text-slate-600"
                    }`}
                  >
                    Approve
                  </p>
                </button>
                <button
                  onClick={() => setReviewVote("reject")}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    reviewVote === "reject"
                      ? "border-red-500 bg-red-50"
                      : "border-slate-200 hover:border-red-300"
                  }`}
                >
                  <ThumbsDown
                    className={`w-6 h-6 mx-auto mb-2 ${
                      reviewVote === "reject" ? "text-red-600" : "text-slate-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      reviewVote === "reject" ? "text-red-700" : "text-slate-600"
                    }`}
                  >
                    Reject
                  </p>
                </button>
              </div>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Confidence Level (1-5)
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((level) => (
                  <button
                    key={level}
                    onClick={() => setReviewConfidence(level.toString())}
                    className={`flex-1 py-3 rounded-lg border-2 transition-all ${
                      reviewConfidence === level.toString()
                        ? "border-violet-500 bg-violet-50 text-violet-700 font-semibold"
                        : "border-slate-200 text-slate-600 hover:border-violet-300"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                1 = Low confidence, 5 = Very high confidence
              </p>
            </div>

            {/* Feedback */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Feedback (Optional)
              </label>
              <textarea
                value={reviewFeedback}
                onChange={(e) => setReviewFeedback(e.target.value)}
                placeholder="Share your thoughts on this application..."
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={1000}
              />
              <p className="text-xs text-slate-500 mt-1">
                {reviewFeedback.length}/1000 characters
              </p>
            </div>

            <Alert type="info">
              Your review helps maintain guild quality. Applications with 2+ approvals are
              automatically accepted as "recruit" members.
            </Alert>

            <div className="flex gap-3">
              <Button
                onClick={() => setShowReviewModal(false)}
                variant="secondary"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitReview}
                disabled={isReviewing}
                className="flex-1"
              >
                {isReviewing ? (
                  <>
                    <Loader2 className="animate-spin mr-2 w-4 h-4" />
                    Submitting...
                  </>
                ) : (
                  <>
                    {reviewVote === "approve" ? (
                      <CheckCircle className="mr-2 w-4 h-4" />
                    ) : (
                      <XCircle className="mr-2 w-4 h-4" />
                    )}
                    Submit Review
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
