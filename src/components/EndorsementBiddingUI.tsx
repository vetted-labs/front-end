"use client";
import { useState } from "react";
import {
  TrendingUp,
  AlertCircle,
  Award,
  Coins,
  Target,
  Users,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  DollarSign,
  Zap,
  Info,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Modal } from "./ui/modal";

interface JobApplication {
  id: string;
  jobTitle: string;
  companyName: string;
  candidateName: string;
  matchScore: number;
  currentEndorsements: Endorsement[];
  minimumBid: number;
  rewardPool: number;
  applicationSummary: string;
}

interface Endorsement {
  expertName: string;
  bidAmount: number;
  rank: number;
  expertReputation: number;
}

interface EndorsementBiddingUIProps {
  applications: JobApplication[];
  expertTokenBalance: number;
  expertReputation: number;
}

export function EndorsementBiddingUI({
  applications,
  expertTokenBalance,
  expertReputation,
}: EndorsementBiddingUIProps) {
  const [selectedApplication, setSelectedApplication] = useState<JobApplication | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [showBidModal, setShowBidModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePlaceBid = async () => {
    if (!selectedApplication || !bidAmount) return;

    setIsSubmitting(true);
    try {
      // API call to place bid
      // await fetch(`/api/endorsements/bid`, {...})

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setShowBidModal(false);
      setBidAmount("");
      alert("Bid placed successfully!");
    } catch (error) {
      alert("Failed to place bid");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTopBidThreshold = (app: JobApplication) => {
    if (app.currentEndorsements.length < 3) {
      return app.minimumBid;
    }
    return Math.max(...app.currentEndorsements.map((e) => e.bidAmount));
  };

  const calculatePotentialReward = (app: JobApplication) => {
    return (app.rewardPool / 3).toFixed(0);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-full mb-4">
          <Zap className="w-4 h-4 text-emerald-600 mr-2" />
          <span className="text-sm font-medium text-emerald-700">
            Layer 3: Endorsement Bidding
          </span>
        </div>
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Endorse Candidates for Jobs
        </h1>
        <p className="text-lg text-muted-foreground max-w-3xl">
          Stake tokens to endorse top candidates. Only the top 3 bidders secure endorsement
          slots. Earn rewards when your endorsed candidates get hired.
        </p>
      </div>

      {/* Expert Balance Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-primary">Your Balance</p>
            <Coins className="w-5 h-5 text-primary" />
          </div>
          <p className="text-3xl font-bold text-foreground">{expertTokenBalance} VETD</p>
          <p className="text-xs text-muted-foreground mt-1">Available for bidding</p>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-amber-700">Your Reputation</p>
            <Award className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">{expertReputation}</p>
          <p className="text-xs text-muted-foreground mt-1">Affects reward multiplier</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-6 border border-emerald-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-emerald-700">Active Endorsements</p>
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-3xl font-bold text-foreground">3</p>
          <p className="text-xs text-muted-foreground mt-1">Currently staked</p>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-blue-50 rounded-xl p-6 border border-blue-200 mb-8">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-foreground mb-2">How Endorsement Bidding Works</h3>
            <ul className="text-sm text-card-foreground space-y-1">
              <li>• <strong>Only top 3 bids</strong> per candidate secure endorsement slots</li>
              <li>• <strong>Non-selected bids are refunded</strong> automatically (no loss)</li>
              <li>• <strong>If hired:</strong> Share reward pool proportional to your bid</li>
              <li>• <strong>If rejected:</strong> Partial slashing based on performance &amp; reputation</li>
              <li>• <strong>Higher reputation</strong> = higher rewards but also higher penalties</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Available Applications */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-6">Available Candidates</h2>
        {applications.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-border">
            <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No applications available for endorsement</p>
          </div>
        ) : (
          <div className="space-y-6">
            {applications.map((app) => (
              <div
                key={app.id}
                className="bg-card rounded-xl p-6 border border-border hover:border-primary/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-foreground">
                        {app.candidateName}
                      </h3>
                      <span className="px-2 py-1 bg-primary/30 text-primary border border-primary/50 dark:bg-primary/40 dark:border-primary/70 text-xs font-semibold rounded-full">
                        {app.matchScore}% Match
                      </span>
                    </div>
                    <p className="text-muted-foreground mb-1">
                      <strong>{app.jobTitle}</strong> at {app.companyName}
                    </p>
                    <p className="text-sm text-muted-foreground">{app.applicationSummary}</p>
                  </div>
                </div>

                {/* Current Endorsements */}
                <div className="bg-muted rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <p className="text-sm font-semibold text-card-foreground">
                        Current Top Endorsements ({app.currentEndorsements.length}/3)
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Min bid: <strong>{app.minimumBid} VETD</strong>
                    </p>
                  </div>

                  {app.currentEndorsements.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-2">
                      No endorsements yet - be the first!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {app.currentEndorsements.map((endorsement, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between bg-card rounded-lg p-3 border border-border"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                endorsement.rank === 1
                                  ? "bg-amber-100 text-amber-700"
                                  : endorsement.rank === 2
                                  ? "bg-muted text-card-foreground"
                                  : "bg-orange-100 text-orange-700"
                              }`}
                            >
                              #{endorsement.rank}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {endorsement.expertName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Rep: {endorsement.expertReputation}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm font-bold text-primary">
                            {endorsement.bidAmount} VETD
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reward & Bid Action */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Potential Reward</p>
                      <p className="text-lg font-bold text-emerald-600">
                        {calculatePotentialReward(app)} VETD
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">To Beat</p>
                      <p className="text-lg font-bold text-foreground">
                        {getTopBidThreshold(app) + 1} VETD
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      setSelectedApplication(app);
                      setBidAmount((getTopBidThreshold(app) + 1).toString());
                      setShowBidModal(true);
                    }}
                    className="flex items-center gap-2"
                  >
                    <Target className="w-4 h-4" />
                    Place Bid
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bidding Modal */}
      <Modal
        isOpen={showBidModal}
        onClose={() => setShowBidModal(false)}
        title="Place Endorsement Bid"
      >
        {selectedApplication && (
          <div className="space-y-4">
            <div className="bg-primary/10 rounded-lg p-4 border border-primary/20">
              <p className="text-sm font-semibold text-foreground mb-1">
                {selectedApplication.candidateName}
              </p>
              <p className="text-xs text-muted-foreground">{selectedApplication.jobTitle}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">
                Your Bid Amount (VETD)
              </label>
              <Input
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                placeholder="Enter bid amount"
                min={selectedApplication.minimumBid}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Minimum: {selectedApplication.minimumBid} VETD | Your balance:{" "}
                {expertTokenBalance} VETD
              </p>
            </div>

            {/* Risk/Reward Preview */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">If hired (reward):</p>
                <p className="text-sm font-bold text-emerald-600">
                  +{calculatePotentialReward(selectedApplication)} VETD
                </p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">If rejected (slashing):</p>
                <p className="text-sm font-bold text-destructive">
                  -{Math.floor(parseInt(bidAmount || "0") * 0.3)} VETD
                </p>
              </div>
              <div className="pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">
                  <strong>Note:</strong> Only top 3 bids secure slots. If outbid, your full stake
                  is refunded.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowBidModal(false)} className="flex-1">
                Cancel
              </Button>
              <Button
                onClick={handlePlaceBid}
                disabled={
                  isSubmitting ||
                  !bidAmount ||
                  parseInt(bidAmount) < selectedApplication.minimumBid ||
                  parseInt(bidAmount) > expertTokenBalance
                }
                className="flex-1"
              >
                {isSubmitting ? "Placing Bid..." : "Confirm Bid"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
