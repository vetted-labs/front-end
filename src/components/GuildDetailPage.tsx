"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useExpertAccount } from "@/lib/hooks/useExpertAccount";
import { toast } from "sonner";
import {
  Users,
  Briefcase,
  Award,
  CheckCircle2,
  Clock,
  MapPin,
  DollarSign,
  Target,
  Trophy,
  Zap,
  Calendar,
  LayoutDashboard,
  Shield,
  User,
} from "lucide-react";
import { Alert, Button, PillTabs } from "@/components/ui";
import { guildsApi, guildApplicationsApi } from "@/lib/api";
import { useFetch } from "@/lib/hooks/useFetch";
import { getGuildIcon } from "@/lib/guildHelpers";
import { formatSalaryRange } from "@/lib/utils";
import { useAuthContext } from "@/hooks/useAuthContext";
import { GuildActivityFeed } from "@/components/guild/GuildActivityTab";
import { GuildFeedTab } from "@/components/guild/GuildFeedTab";
import { GuildPublicOverviewTab } from "@/components/guild/GuildPublicOverviewTab";
import { GuildExpertsListTab } from "@/components/guild/GuildExpertsListTab";
import { GuildCandidatesListTab } from "@/components/guild/GuildCandidatesListTab";
import { GuildLeaderboardContent } from "@/components/guild/GuildLeaderboardContent";
import { STATUS_COLORS } from "@/config/colors";
import type { GuildPageDetail, GuildLeaderboardEntry, GuildMembershipCheck, GuildApplication, Job, ExpertMember, CandidateMember, ExpertRole, CandidateGuildApplication, GuildActivity } from "@/types";



export default function GuildDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useExpertAccount();
  const auth = useAuthContext();
  const guildId = decodeURIComponent(params.guildId as string);

  const [activeTab, setActiveTab] = useState<"feed" | "overview" | "experts" | "candidates" | "jobs" | "activity" | "leaderboard">("feed");
  const [leaderboard, setLeaderboard] = useState<GuildLeaderboardEntry[]>([]);

  const isAuthenticated = auth.isAuthenticated || isConnected;

  const { data: guildData, isLoading, error } = useFetch<{ guild: GuildPageDetail; membership: GuildMembershipCheck }>(
    async () => {
      const raw = await guildsApi.getPublicDetail(guildId);
      const experts: ExpertMember[] = Array.isArray(raw.experts) ? raw.experts : [];
      const candidates: CandidateMember[] = Array.isArray(raw.candidates) ? raw.candidates : [];
      const recentJobs: Job[] = Array.isArray(raw.recentJobs) ? raw.recentJobs : [];
      let recentActivity: GuildActivity[] = Array.isArray(raw.recentActivity)
        ? (raw.recentActivity as GuildActivity[])
        : [];

      let candidateApps: CandidateGuildApplication[] = [];
      let guildProposals: GuildApplication[] = [];
      try {
        const [candResult, proposalResult] = await Promise.allSettled([
          guildsApi.getCandidateApplications(guildId),
          guildApplicationsApi.getByGuild(guildId),
        ]);
        if (candResult.status === "fulfilled") {
          candidateApps = Array.isArray(candResult.value) ? candResult.value : [];
        }
        if (proposalResult.status === "fulfilled") {
          guildProposals = Array.isArray(proposalResult.value) ? proposalResult.value : [];
        }
      } catch {
        // Non-critical
      }

      if (recentActivity.length === 0) {
        const derived: GuildActivity[] = [];
        experts.forEach((e) => {
          if (e.joinedAt) {
            derived.push({ id: `expert-join-${e.id}`, type: "expert_joined", actor: e.fullName, details: `joined as ${e.role || "expert"}`, timestamp: e.joinedAt });
          }
        });
        candidates.forEach((c) => {
          if (c.joinedAt) {
            derived.push({ id: `candidate-join-${c.id}`, type: "candidate_joined", actor: c.fullName, details: "joined as a candidate member", timestamp: c.joinedAt });
          }
        });
        recentJobs.forEach((j) => {
          if (j.createdAt) {
            derived.push({ id: `job-posted-${j.id}`, type: "job_posted", actor: j.title, details: `new position opened · ${j.location || "Remote"} · ${j.type || "Full-time"}`, timestamp: j.createdAt });
          }
        });
        candidateApps.forEach((app) => {
          const ts = app.submittedAt;
          if (!ts) return;
          const statusLabel = app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : "pending review";
          derived.push({ id: `cand-app-${app.id}`, type: "application_submitted", actor: app.candidateName || "A candidate", details: `applied to join${app.jobTitle ? ` for ${app.jobTitle}` : ""} · ${statusLabel}`, timestamp: ts });
        });
        guildProposals.forEach((p) => {
          const ts = p.created_at;
          if (!ts) return;
          if (candidateApps.some((a) => a.candidateEmail === p.candidate_email && a.id !== p.id)) return;
          const statusLabel = p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending review";
          derived.push({ id: `proposal-${p.id}`, type: "application_submitted", actor: p.candidate_name || "A member", details: `submitted an application · ${statusLabel}`, timestamp: ts });
        });
        derived.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        recentActivity = derived.slice(0, 50);
      }

      const guild: GuildPageDetail = {
        ...raw,
        experts, candidates, recentJobs, recentActivity,
        expertCount: raw.expertCount ?? experts.length,
        candidateCount: raw.candidateCount ?? candidates.length,
        totalMembers: raw.totalMembers ?? raw.memberCount ?? 0,
        openPositions: raw.openPositions ?? recentJobs.length,
        totalProposalsReviewed: raw.totalProposalsReviewed ?? raw.statistics?.vettedProposals ?? 0,
        averageApprovalTime: raw.averageApprovalTime ?? "—",
        establishedDate: raw.establishedDate ?? raw.createdAt ?? "",
      };

      let membershipResult: GuildMembershipCheck = { isMember: false };
      const userId = auth.userId || address;
      if (userId) {
        try {
          const membershipData = await guildsApi.checkMembership(userId, guildId);
          membershipResult = { isMember: membershipData.isMember, role: membershipData.role as ExpertRole | undefined };
        } catch {
          membershipResult = { isMember: false };
        }
      }

      return { guild, membership: membershipResult };
    },
    {
      onError: () => { toast.error("Failed to load guild details"); },
    }
  );

  const guild = guildData?.guild ?? null;
  const membership = guildData?.membership ?? null;

  // eslint-disable-next-line no-restricted-syntax -- fetch leaderboard on tab switch
  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const entries = await guildsApi.getLeaderboard(guildId, { limit: 100 });
        setLeaderboard((entries || []).filter((e) => e.role !== "candidate"));
      } catch {
        setLeaderboard([]);
      }
    };
    if (activeTab === "leaderboard" && leaderboard.length === 0) {
      fetchLeaderboard();
    }
  }, [activeTab, guildId, leaderboard.length]);

  const handleApplyToGuild = () => {
    if (!isAuthenticated) {
      router.push(`/auth/login?type=candidate&redirect=/guilds/${guildId}/apply`);
      return;
    }
    if (isConnected) {
      router.push(`/expert/apply?guild=${encodeURIComponent(guildId)}`);
      return;
    }
    router.push(`/guilds/${guildId}/apply`);
  };

  if (isLoading) return null;

  if (error || !guild) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="error">{error || "Guild not found"}</Alert>
      </div>
    );
  }

  const showApplyButton = !membership?.isMember && membership?.status !== "pending";
  const showPendingStatus = membership?.status === "pending";
  const showMemberBadge = membership?.isMember;
  const GuildIcon = getGuildIcon(guild.name);

  return (
    <div className="relative min-h-screen overflow-x-hidden animate-page-enter">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="profile-ambient-orb profile-ambient-orb-1" />
        <div className="profile-ambient-orb profile-ambient-orb-2" />
        <div className="profile-dot-grid" />
      </div>

      <div className="relative z-10">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">

          {/* ═══ BENTO GRID ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_340px] gap-3 mb-3">

            {/* ── Identity Card (left, spans 2 rows) ── */}
            <div className="md:row-span-2 glass-card glass-border-shimmer rounded-2xl border border-border/60 p-8 animate-fade-up">
              {/* Guild icon */}
              <div className="w-14 h-14 rounded-2xl bg-primary/[0.08] border border-primary/20 flex items-center justify-center mb-4 shadow-[0_0_20px_hsl(var(--primary)/0.1)]">
                <GuildIcon className="w-7 h-7 text-primary" />
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-[42px] font-extrabold font-display tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent mb-2">
                {guild.name}
              </h1>

              {/* Description */}
              <p className="text-base text-muted-foreground leading-relaxed mb-4 max-w-xl">
                {guild.description}
              </p>

              {/* Meta chips */}
              <div className="flex flex-wrap items-center gap-2.5 mb-4">
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  {guild.totalMembers || (guild.expertCount + guild.candidateCount)} members
                </span>
                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Award className="w-3.5 h-3.5 text-muted-foreground" />
                  {guild.expertCount} experts
                </span>
                <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  {guild.openPositions} open roles
                </span>
                {guild.establishedDate && (
                  <>
                    <span className="w-[3px] h-[3px] rounded-full bg-muted-foreground/40" />
                    <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                      Est. {new Date(guild.establishedDate).getFullYear()}
                    </span>
                  </>
                )}
              </div>

              {/* Member badge */}
              {showMemberBadge && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-positive/10 border border-positive/20 text-[11px] font-semibold text-positive mb-4">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Member
                  {membership.role && (
                    <>
                      <span className="opacity-40 mx-0.5">·</span>
                      <span className={membership.role === "master" ? "text-warning" : "text-primary"}>
                        {membership.role}
                      </span>
                    </>
                  )}
                </div>
              )}
              {showPendingStatus && (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-warning/[0.08] border border-warning/20 text-[11px] font-semibold text-warning mb-4">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  Pending Review
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-2">
                {membership?.isMember && auth.userType === "expert" && (
                  <button
                    onClick={() => router.push(`/expert/guild/${guildId}`)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/[0.03] border border-border/60 text-[12px] font-medium text-muted-foreground hover:border-primary/30 hover:text-foreground hover:bg-white/[0.05] transition-all"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5" />
                    Expert Dashboard
                  </button>
                )}
                {showApplyButton && (
                  <Button onClick={handleApplyToGuild} size="lg" className="px-8 rounded-full">
                    Apply to Join Guild
                  </Button>
                )}
              </div>
            </div>

            {/* ── Your Position / Guild Stats (right, row 1) ── */}
            <div className="glass-card glass-border-shimmer rounded-2xl border border-border/60 p-6 flex flex-col animate-fade-up animate-delay-100">
              {showMemberBadge ? (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground mb-4 flex items-center gap-1.5">
                    <User className="w-3 h-3 text-primary" />
                    Your Position
                  </div>
                  <div className="font-mono text-4xl font-extrabold text-foreground tracking-tight mb-0.5">
                    {guild.expertCount > 0 ? guild.expertCount * 100 : 0}
                  </div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3">Reputation</div>
                  {membership.role && (
                    <div className="mb-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/[0.08] border border-primary/20 text-[10px] font-bold uppercase tracking-[1px] text-primary">
                        <span className="w-1 h-1 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary))]" />
                        {membership.role}
                      </span>
                    </div>
                  )}
                  <div className="w-full h-[3px] rounded-full bg-border/40 overflow-hidden mb-1">
                    <div className="h-full rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]" style={{ width: membership.role === "master" ? "100%" : "50%" }} />
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground mb-4">
                    {membership.role === "master" ? "Max rank achieved" : "Progressing"}
                  </div>
                  <div className="w-full h-px bg-border/60 mb-3" />
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Earnings</span>
                    <span>
                      <span className="font-mono text-xl font-bold text-positive">$0</span>
                      <span className="font-mono text-[11px] text-muted-foreground ml-1">VETD</span>
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground mb-4 flex items-center gap-1.5">
                    <Award className="w-3 h-3 text-primary" />
                    Guild Stats
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Experts</span>
                      <span className="font-mono text-lg font-bold">{guild.expertCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Candidates</span>
                      <span className="font-mono text-lg font-bold">{guild.candidateCount}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Open Roles</span>
                      <span className="font-mono text-lg font-bold text-primary">{guild.openPositions}</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* ── Health Stats (left, row 2) ── */}
            <div className="glass-card rounded-2xl border border-border/60 p-5 flex items-center divide-x divide-border/60 animate-fade-up animate-delay-200">
              <div className="flex-1 text-center px-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="font-mono text-xl font-bold text-foreground">{guild.totalProposalsReviewed || 0}</div>
                <div className="text-[10px] text-muted-foreground">Reviewed</div>
              </div>
              <div className="flex-1 text-center px-2">
                <div className="w-7 h-7 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-warning" />
                </div>
                <div className="font-mono text-xl font-bold text-foreground">{guild.averageApprovalTime || "—"}</div>
                <div className="text-[10px] text-muted-foreground">Avg Time</div>
              </div>
              <div className="flex-1 text-center px-2">
                <div className="w-7 h-7 rounded-lg bg-positive/10 flex items-center justify-center mx-auto mb-1.5">
                  <Trophy className="w-3.5 h-3.5 text-positive" />
                </div>
                <div className="font-mono text-xl font-bold text-foreground">{guild.candidates?.length || guild.candidateCount || 0}</div>
                <div className="text-[10px] text-muted-foreground">Candidates</div>
              </div>
              <div className="flex-1 text-center px-2">
                <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center mx-auto mb-1.5">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="font-mono text-xl font-bold text-foreground">{guild.totalMembers || 0}</div>
                <div className="text-[10px] text-muted-foreground">Members</div>
              </div>
            </div>

            {/* ── Staking Card (right, row 2) ── */}
            <div className="glass-card glass-border-shimmer rounded-2xl border border-border/60 p-6 flex flex-col justify-center animate-fade-up animate-delay-300">
              <div className="text-[10px] font-bold uppercase tracking-[1.2px] text-muted-foreground mb-2.5 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-primary" />
                Guild Staking
              </div>
              <div className="flex items-baseline gap-1.5 mb-1">
                <span className="font-mono text-[28px] font-bold text-foreground">
                  {guild.totalVetdStaked != null
                    ? Number(guild.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : guild.statistics?.totalVetdStaked != null
                    ? Number(guild.statistics.totalVetdStaked).toLocaleString(undefined, { maximumFractionDigits: 0 })
                    : "0"}
                </span>
                <span className="font-mono text-xs font-semibold text-primary">VETD</span>
              </div>
              <div className="text-[11px] text-muted-foreground mb-3.5">Total staked by all members</div>
              {showMemberBadge && (
                <button
                  onClick={() => router.push(`/expert/guild/${guildId}`)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[10px] bg-primary/[0.08] border border-primary/20 text-primary font-display text-xs font-bold transition-all hover:bg-primary/[0.15] hover:shadow-[0_0_14px_hsl(var(--primary)/0.1)] w-fit"
                >
                  <Shield className="w-3.5 h-3.5" />
                  Stake VETD
                </button>
              )}
            </div>
          </div>

          {/* ═══ TABS ═══ */}
          <div className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl border-b border-border/60 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 mb-8 animate-fade-up animate-delay-400">
            <PillTabs
              tabs={[
                { value: "feed" as const, label: "Feed" },
                { value: "overview" as const, label: "Overview" },
                { value: "experts" as const, label: `Experts (${guild.experts?.length || guild.expertCount || 0})` },
                { value: "candidates" as const, label: `Candidates (${guild.candidates?.length || guild.candidateCount || 0})` },
                { value: "jobs" as const, label: `Jobs (${guild.recentJobs?.length || 0})` },
                { value: "activity" as const, label: "Activity" },
                { value: "leaderboard" as const, label: "Leaderboard" },
              ]}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>

          {/* ═══ TAB CONTENT ═══ */}
          <div className="pb-12" role="tabpanel">
            {activeTab === "feed" && (
              <GuildFeedTab
                guildId={guildId}
                isMember={membership?.isMember ?? false}
                membershipRole={membership?.role as ExpertRole | undefined}
                userType={auth.userType}
              />
            )}

            {activeTab === "overview" && (
              <GuildPublicOverviewTab
                guild={guild}
                isMember={!!showMemberBadge}
                isPending={!!showPendingStatus}
                onNavigate={(path) => router.push(path)}
                onTabChange={(tab) => setActiveTab(tab as typeof activeTab)}
                onApply={handleApplyToGuild}
              />
            )}

            {activeTab === "experts" && (
              <GuildExpertsListTab
                experts={guild.experts || []}
                onNavigate={(path) => router.push(path)}
              />
            )}

            {activeTab === "candidates" && (
              <GuildCandidatesListTab candidates={guild.candidates || []} />
            )}

            {activeTab === "jobs" && (
              <div>
                <h2 className="text-2xl font-bold font-display text-foreground mb-6">Open Positions</h2>
                {guild.recentJobs && guild.recentJobs.length > 0 ? (
                  <div className="space-y-3">
                    {guild.recentJobs.map((job) => (
                      <button
                        key={job.id}
                        onClick={() => router.push(`/browse/jobs/${job.id}`)}
                        className="w-full glass-card glass-border-shimmer border border-border/60 rounded-xl p-6 hover:border-primary/30 transition-all text-left"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold text-foreground mb-3">{job.title}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {job.location}
                              </span>
                              <span className="px-2 py-1 bg-primary/10 text-primary border border-primary/20 text-xs font-medium rounded">
                                {job.type}
                              </span>
                              {(job.salary.min || job.salary.max) && (
                                <span className="flex items-center gap-1 font-semibold text-positive">
                                  <DollarSign className="w-4 h-4" />
                                  {formatSalaryRange(job.salary)}
                                </span>
                              )}
                              {(job.applicants ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  {job.applicants} applicants
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {new Date(job.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 glass-card rounded-2xl border border-border/60">
                    <Briefcase className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-60" />
                    <p className="text-muted-foreground">No open positions at the moment</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <GuildActivityFeed activities={guild.recentActivity || []} />
            )}

            {activeTab === "leaderboard" && (
              <GuildLeaderboardContent
                leaderboard={leaderboard}
                onNavigate={(path) => router.push(path)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
