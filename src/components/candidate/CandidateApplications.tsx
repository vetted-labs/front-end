"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Send,
  MapPin,
  Briefcase,
  Calendar,
  Banknote,
  Clock,
  Sparkles,
  Eye,
  Trophy,
  CheckCircle2,
  XCircle,
  MoreVertical,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { applicationsApi } from "@/lib/api";
import { getCompanyAvatar } from "@/lib/avatars";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { GuildBadge } from "@/components/ui/guild";
import { useApi, useFetch } from "@/lib/hooks/useFetch";
import { useRequireAuth } from "@/lib/hooks/useRequireAuth";
import { useClickOutside } from "@/lib/hooks/useClickOutside";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { useClientPagination } from "@/lib/hooks/useClientPagination";
import { Pagination } from "@/components/ui/pagination";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { STATUS_COLORS } from "@/config/colors";
import { cn, formatSalaryRange, formatTimeAgo } from "@/lib/utils";
import { DataSection } from "@/lib/motion";
import type { CandidateApplication, ApplicationStatus } from "@/types";

// ─── Pipeline model ───────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  { key: "applied", label: "Applied" },
  { key: "expert_review", label: "Expert review" },
  { key: "company_review", label: "Company review" },
  { key: "interview", label: "Interview" },
  { key: "offer", label: "Offer" },
] as const;

type PipelineStepKey = (typeof PIPELINE_STEPS)[number]["key"];

function getStepIndex(status: ApplicationStatus): number {
  switch (status) {
    case "pending":
      return 0;
    case "reviewing":
      return 1;
    case "interviewed":
      return 3;
    case "accepted":
      return 4;
    case "rejected":
      return -1;
    default:
      return 0;
  }
}

function getRejectedAtIndex(application: CandidateApplication): number {
  if (application.status !== "rejected") return -1;

  const history = (
    application as CandidateApplication & {
      statusHistory?: { status: string; previousStatus?: string }[];
    }
  ).statusHistory;

  if (history?.length) {
    const rejectionEntry = history.find((h) => h.status === "rejected");
    if (rejectionEntry?.previousStatus) {
      const stepMap: Record<string, number> = {
        pending: 0,
        reviewing: 1,
        reviewed: 2,
        interviewed: 3,
      };
      return stepMap[rejectionEntry.previousStatus] ?? 2;
    }
  }
  return 2;
}

function getCurrentStepKey(app: CandidateApplication): PipelineStepKey | null {
  if (app.status === "rejected") return null;
  const idx = getStepIndex(app.status);
  return PIPELINE_STEPS[idx]?.key ?? null;
}

// ─── Filter / sort options ────────────────────────────────────────────────────

type FilterStatus = "all" | ApplicationStatus;
type SortBy = "newest" | "oldest" | "company";

const FILTER_OPTIONS: { value: FilterStatus; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Applied" },
  { value: "reviewing", label: "Under review" },
  { value: "interviewed", label: "Interview" },
  { value: "accepted", label: "Offered" },
  { value: "rejected", label: "Rejected" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CandidateApplications() {
  const router = useRouter();
  const { ready } = useRequireAuth("candidate");
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [withdrawingId, setWithdrawingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setOpenMenuId(null));

  const { execute: withdrawApp, isLoading: withdrawing } = useApi();

  const { data: applicationsData, isLoading, refetch } = useFetch(
    () => applicationsApi.getAll(),
    { skip: !ready }
  );

  const applications: CandidateApplication[] = useMemo(
    () => applicationsData?.applications ?? [],
    [applicationsData]
  );

  // Stats over the full set (not affected by filter)
  const stats = useMemo(
    () => ({
      total: applications.length,
      reviewing: applications.filter(
        (a) => a.status === "pending" || a.status === "reviewing"
      ).length,
      interviewed: applications.filter((a) => a.status === "interviewed").length,
      accepted: applications.filter((a) => a.status === "accepted").length,
    }),
    [applications]
  );

  // Pipeline distribution (counts at each stage from candidate POV)
  const pipelineCounts = useMemo(() => {
    const counts: Record<PipelineStepKey, number> = {
      applied: 0,
      expert_review: 0,
      company_review: 0,
      interview: 0,
      offer: 0,
    };
    applications.forEach((a) => {
      const key = getCurrentStepKey(a);
      if (key) counts[key] += 1;
    });
    return counts;
  }, [applications]);

  // Apply filter + search + sort
  const visible = useMemo(() => {
    let list = applications;
    if (filter !== "all") list = list.filter((a) => a.status === filter);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (a) =>
          a.job.title.toLowerCase().includes(q) ||
          (a.job.companyName ?? "").toLowerCase().includes(q) ||
          a.job.location.toLowerCase().includes(q)
      );
    }
    const sorted = [...list];
    if (sortBy === "newest")
      sorted.sort(
        (a, b) =>
          new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()
      );
    if (sortBy === "oldest")
      sorted.sort(
        (a, b) =>
          new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
      );
    if (sortBy === "company")
      sorted.sort((a, b) =>
        (a.job.companyName ?? "").localeCompare(b.job.companyName ?? "")
      );
    return sorted;
  }, [applications, filter, debouncedSearch, sortBy]);

  const {
    paginatedItems: paginated,
    currentPage,
    totalPages,
    setCurrentPage,
  } = useClientPagination(visible, 10);

  // Highlighted pipeline stage = the active application's stage if any
  const activeStepKey = useMemo(() => {
    if (!activeId) return null;
    const a = applications.find((x) => x.id === activeId);
    if (!a) return null;
    return getCurrentStepKey(a);
  }, [activeId, applications]);

  if (!ready) return null;

  return (
    <div className="min-h-full relative animate-page-enter">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Candidate
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight font-display mt-1.5">
            My applications
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 max-w-xl">
            Track every role you&apos;ve applied to and watch it move through
            expert review, company review, interview, and offer.
          </p>
        </header>

        <DataSection isLoading={isLoading} skeleton={null}>
          {/* ── KPI tiles ────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile
              icon={<Send className="w-5 h-5" />}
              label="Total applied"
              value={stats.total}
              tone="info"
            />
            <KpiTile
              icon={<Eye className="w-5 h-5" />}
              label="In review"
              value={stats.reviewing}
              tone="warning"
            />
            <KpiTile
              icon={<Sparkles className="w-5 h-5" />}
              label="Interviews"
              value={stats.interviewed}
              tone="positive"
            />
            <KpiTile
              icon={<Trophy className="w-5 h-5" />}
              label="Offers"
              value={stats.accepted}
              tone="primary"
            />
          </div>

          {/* ── Pipeline card ───────────────────────────────────────── */}
          <PipelineCard
            counts={pipelineCounts}
            activeKey={activeStepKey}
            total={applications.length}
          />

          {/* ── Toolbar ────────────────────────────────────────────── */}
          <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search by job title, company, or location…"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm placeholder:text-muted-foreground/70 outline-none transition-colors"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filter}
                  onChange={(e) => {
                    setFilter(e.target.value as FilterStatus);
                    setCurrentPage(1);
                  }}
                  className="px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm outline-none transition-colors cursor-pointer"
                >
                  {FILTER_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="px-3.5 py-2.5 rounded-xl bg-muted/40 border border-border focus:ring-2 focus:ring-primary/40 focus:border-primary text-foreground text-sm outline-none transition-colors cursor-pointer"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="company">Company A → Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Application rows ────────────────────────────────────── */}
          {visible.length === 0 ? (
            <EmptyState
              filter={filter}
              hasSearch={debouncedSearch.length > 0}
              onBrowse={() => router.push("/browse/jobs")}
              onClearFilters={() => {
                setFilter("all");
                setSearchQuery("");
                setCurrentPage(1);
              }}
            />
          ) : (
            <div ref={menuRef} className="rounded-xl border border-border bg-card overflow-hidden">
              <ul>
                {paginated.map((application) => (
                  <ApplicationRow
                    key={application.id}
                    application={application}
                    isActive={activeId === application.id}
                    isMenuOpen={openMenuId === application.id}
                    onSelect={() =>
                      setActiveId((cur) =>
                        cur === application.id ? null : application.id
                      )
                    }
                    onMenuToggle={(e) => {
                      e.stopPropagation();
                      setOpenMenuId((cur) =>
                        cur === application.id ? null : application.id
                      );
                    }}
                    onView={(e) => {
                      e.stopPropagation();
                      router.push(`/browse/jobs/${application.job.id}`);
                    }}
                    onWithdraw={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(null);
                      setWithdrawingId(application.id);
                    }}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* ── Pagination ──────────────────────────────────────────── */}
          {totalPages > 1 && (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </DataSection>
      </div>

      {/* ── Withdraw confirmation modal ────────────────────────────── */}
      <Modal
        isOpen={!!withdrawingId}
        onClose={() => setWithdrawingId(null)}
        title="Withdraw application"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to withdraw this application? This cannot be
            undone, but you can reapply later.
          </p>
          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={() => setWithdrawingId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={withdrawing}
              onClick={() => {
                if (!withdrawingId) return;
                withdrawApp(() => applicationsApi.withdraw(withdrawingId), {
                  onSuccess: () => {
                    toast.success("Application withdrawn");
                    setWithdrawingId(null);
                    refetch();
                  },
                  onError: (err) => toast.error(err),
                });
              }}
            >
              {withdrawing ? "Withdrawing…" : "Withdraw"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Pipeline card ────────────────────────────────────────────────────────────

interface PipelineCardProps {
  counts: Record<PipelineStepKey, number>;
  activeKey: PipelineStepKey | null;
  total: number;
}

function PipelineCard({ counts, activeKey, total }: PipelineCardProps) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
          <span className="text-primary">
            <Sparkles className="w-4 h-4" />
          </span>
          Pipeline
        </h2>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          {total} application{total === 1 ? "" : "s"}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-stretch gap-2 sm:gap-3 overflow-x-auto">
          {PIPELINE_STEPS.map((step, i) => {
            const isActive = activeKey === step.key;
            const count = counts[step.key];
            return (
              <div
                key={step.key}
                className="flex items-stretch flex-1 min-w-[110px]"
              >
                <div
                  className={cn(
                    "flex-1 rounded-xl border p-3 transition-colors",
                    isActive
                      ? "border-primary/40 bg-primary/10"
                      : "border-border bg-muted/30"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-6 h-6 rounded-full grid place-items-center text-[11px] font-bold tabular-nums",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : count > 0
                            ? "bg-foreground/10 text-foreground"
                            : "bg-muted text-muted-foreground/60"
                      )}
                    >
                      {i + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[10.5px] font-bold uppercase tracking-[0.14em]",
                        isActive ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "mt-2 text-2xl font-bold tabular-nums leading-none",
                      isActive ? "text-primary" : "text-foreground"
                    )}
                  >
                    {count}
                  </p>
                </div>
                {i < PIPELINE_STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="self-center w-3 sm:w-4 h-px bg-border mx-1"
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─── Application row ──────────────────────────────────────────────────────────

interface ApplicationRowProps {
  application: CandidateApplication;
  isActive: boolean;
  isMenuOpen: boolean;
  onSelect: () => void;
  onMenuToggle: (e: React.MouseEvent) => void;
  onView: (e: React.MouseEvent) => void;
  onWithdraw: (e: React.MouseEvent) => void;
}

function ApplicationRow({
  application,
  isActive,
  isMenuOpen,
  onSelect,
  onMenuToggle,
  onView,
  onWithdraw,
}: ApplicationRowProps) {
  const statusStyle =
    APPLICATION_STATUS_CONFIG[application.status] ??
    APPLICATION_STATUS_CONFIG.pending;
  const companyName = application.job.companyName ?? "Company";
  const logoUrl = getCompanyAvatar(companyName);
  const canWithdraw =
    application.status === "pending" || application.status === "reviewing";

  const stepIdx = getStepIndex(application.status);
  const rejectedAt = getRejectedAtIndex(application);
  const isRejected = application.status === "rejected";
  const stageLabel = isRejected
    ? PIPELINE_STEPS[Math.max(rejectedAt, 0)]?.label ?? "Pipeline"
    : PIPELINE_STEPS[stepIdx]?.label ?? "Pipeline";

  const salaryLabel = application.job.salary
    ? formatSalaryRange(application.job.salary)
    : null;

  return (
    <li
      className={cn(
        "group relative border-b border-border last:border-b-0 transition-colors cursor-pointer",
        isActive
          ? "bg-muted/40 border-l-2 border-l-primary"
          : "border-l-2 border-l-transparent hover:bg-muted/20"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3 py-3.5 pl-5 pr-4">
        {/* Logo */}
        <div className="relative w-9 h-9 rounded-lg border border-border bg-white p-1 flex-shrink-0 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element -- backend / generated avatar */}
          <img
            src={logoUrl}
            alt={`${companyName} logo`}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0 flex-1">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold text-foreground leading-snug truncate group-hover:text-primary transition-colors">
                {application.job.title}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">
                {companyName}
              </p>
            </div>

            {/* More-actions menu */}
            <div className="relative flex-shrink-0">
              <button
                type="button"
                onClick={onMenuToggle}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                aria-label="Application actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
              {isMenuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 mt-1 w-44 bg-card rounded-xl shadow-lg border border-border py-1 z-20"
                >
                  <button
                    type="button"
                    onClick={onView}
                    className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-muted/60 flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    {application.status === "accepted"
                      ? "View offer"
                      : "View details"}
                  </button>
                  {canWithdraw && (
                    <button
                      type="button"
                      onClick={onWithdraw}
                      className={cn(
                        "w-full px-4 py-2 text-left text-sm hover:bg-destructive/10 flex items-center gap-2",
                        STATUS_COLORS.negative.text
                      )}
                    >
                      <XCircle className="w-4 h-4" />
                      Withdraw
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Sub line */}
          <p className="text-[11px] text-muted-foreground/80 mt-1.5 flex items-center gap-x-1.5 flex-wrap">
            {application.job.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="w-3 h-3 opacity-70" />
                <span className="truncate">{application.job.location}</span>
              </span>
            )}
            {application.job.type && (
              <>
                <span aria-hidden className="opacity-50">·</span>
                <span className="inline-flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 opacity-70" />
                  <span className="truncate capitalize">
                    {application.job.type}
                  </span>
                </span>
              </>
            )}
            <span aria-hidden className="opacity-50">·</span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="w-3 h-3 opacity-70" />
              Applied {formatTimeAgo(application.appliedAt)}
            </span>
          </p>

          {/* Pill row */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10.5px] font-semibold border",
                statusStyle.className
              )}
            >
              <StatusDot status={application.status} />
              {statusStyle.label}
            </span>
            {!isRejected && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted/40 border border-border text-muted-foreground">
                <Clock className="w-2.5 h-2.5" />
                {stageLabel}
              </span>
            )}
            {application.job.guild && (
              <GuildBadge guild={application.job.guild} size="xs" />
            )}
            {salaryLabel && salaryLabel !== "Salary not specified" && (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-muted/40 border border-border text-foreground tabular-nums">
                <Banknote className="w-2.5 h-2.5 opacity-70" />
                {salaryLabel}
              </span>
            )}
          </div>

          {/* Inline pipeline strip when active */}
          {isActive && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-3 pt-3 border-t border-border/40"
            >
              <PipelineStrip application={application} />
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

function StatusDot({ status }: { status: ApplicationStatus }) {
  const cls =
    status === "accepted"
      ? STATUS_COLORS.positive.dot
      : status === "rejected"
        ? STATUS_COLORS.negative.dot
        : status === "interviewed"
          ? STATUS_COLORS.info.dot
          : status === "reviewing"
            ? STATUS_COLORS.info.dot
            : STATUS_COLORS.pending.dot;
  return <span className={cn("w-[7px] h-[7px] rounded-full", cls)} />;
}

// ─── Inline pipeline strip (shown when row is expanded) ──────────────────────

function PipelineStrip({ application }: { application: CandidateApplication }) {
  const { status } = application;
  const isRejected = status === "rejected";
  const currentStep = getStepIndex(status);
  const rejectedAt = getRejectedAtIndex(application);

  return (
    <div>
      <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2.5">
        Vetting progress
      </p>
      <div className="flex items-center">
        {PIPELINE_STEPS.map((step, i) => {
          let nodeState: "completed" | "active" | "rejected" | "pending";
          if (isRejected) {
            if (i < rejectedAt) nodeState = "completed";
            else if (i === rejectedAt) nodeState = "rejected";
            else nodeState = "pending";
          } else {
            if (i < currentStep) nodeState = "completed";
            else if (i === currentStep) nodeState = "active";
            else nodeState = "pending";
          }

          let connectorState: "completed" | "active" | "pending" = "pending";
          if (!isRejected) {
            if (i < currentStep) connectorState = "completed";
            else if (i === currentStep) connectorState = "active";
          } else if (i < rejectedAt) {
            connectorState = "completed";
          }

          return (
            <div
              key={step.key}
              className="flex items-center flex-1 last:flex-none relative"
            >
              <div className="relative z-10">
                <div
                  className={cn(
                    "w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold transition-all",
                    nodeState === "completed" &&
                      `${STATUS_COLORS.positive.bgSubtle} ${STATUS_COLORS.positive.text}`,
                    nodeState === "active" &&
                      "bg-primary text-primary-foreground",
                    nodeState === "rejected" &&
                      `${STATUS_COLORS.negative.bgSubtle} ${STATUS_COLORS.negative.text}`,
                    nodeState === "pending" &&
                      "bg-muted/40 border border-border text-muted-foreground/40"
                  )}
                >
                  {nodeState === "completed" ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : nodeState === "rejected" ? (
                    <XCircle className="w-3 h-3" />
                  ) : nodeState === "active" ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  ) : null}
                </div>
                <span
                  className={cn(
                    "absolute top-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-medium",
                    nodeState === "active" && "text-primary font-semibold",
                    nodeState === "completed" && "text-muted-foreground",
                    nodeState === "rejected" && STATUS_COLORS.negative.text,
                    nodeState === "pending" && "text-muted-foreground/40"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {i < PIPELINE_STEPS.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px min-w-[12px] mx-1",
                    connectorState === "completed"
                      ? "bg-positive/40"
                      : connectorState === "active"
                        ? "bg-positive/30"
                        : "bg-border/40"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
      <div className="h-5" />
    </div>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({
  filter,
  hasSearch,
  onBrowse,
  onClearFilters,
}: {
  filter: FilterStatus;
  hasSearch: boolean;
  onBrowse: () => void;
  onClearFilters: () => void;
}) {
  const filtered = filter !== "all" || hasSearch;
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 text-primary grid place-items-center mb-4">
        <Send className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-foreground">
        {filtered ? "No applications match your filters" : "No applications yet"}
      </h3>
      <p className="text-sm text-muted-foreground mt-1.5 max-w-sm mx-auto">
        {filtered
          ? "Try adjusting your search or filters to see more results."
          : "Start applying to roles and watch them move through the vetting pipeline here."}
      </p>
      <div className="mt-5">
        {filtered ? (
          <Button variant="outline" onClick={onClearFilters}>
            Clear filters
          </Button>
        ) : (
          <Button onClick={onBrowse} icon={<Briefcase className="w-4 h-4" />}>
            Browse jobs
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── KpiTile (shared inline helper) ──────────────────────────────────────────

interface KpiTileProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  tone: "primary" | "positive" | "info" | "warning";
}

const TONE_STYLES: Record<KpiTileProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-primary/10", text: "text-primary" },
  positive: { bg: "bg-emerald-500/10", text: "text-emerald-500" },
  info: { bg: "bg-sky-500/10", text: "text-sky-500" },
  warning: { bg: "bg-amber-500/10", text: "text-amber-500" },
};

function KpiTile({ icon, label, value, tone }: KpiTileProps) {
  const toneClass = TONE_STYLES[tone];
  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
      <span
        className={cn(
          "w-10 h-10 rounded-lg grid place-items-center flex-shrink-0",
          toneClass.bg,
          toneClass.text
        )}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="text-3xl font-bold text-foreground tabular-nums leading-tight mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}
