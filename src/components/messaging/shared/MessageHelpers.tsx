"use client";

import type { ReactNode } from "react";
import { cn, formatTimeAgo } from "@/lib/utils";
import { APPLICATION_STATUS_CONFIG } from "@/config/constants";
import { getPersonAvatar, getCompanyAvatar } from "@/lib/avatars";
import type { Conversation } from "@/types";

/* ── Hero ─────────────────────────────────────────────────────────────── */

export interface MessagesHeroProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  unreadCount?: number;
  rightSlot?: ReactNode;
}

export function MessagesHero({
  eyebrow,
  title,
  subtitle,
  unreadCount,
  rightSlot,
}: MessagesHeroProps) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          {subtitle}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {typeof unreadCount === "number" && unreadCount > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary tabular-nums">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            {unreadCount} unread
          </span>
        )}
        {rightSlot}
      </div>
    </header>
  );
}

/* ── Section / SidebarCard / KeyValue / Pill ─────────────────────────── */

export function Section({
  title,
  icon,
  meta,
  children,
}: {
  title: string;
  icon?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
        <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h2>
        {meta && (
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {meta}
          </span>
        )}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function SidebarCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {icon && <span className="text-primary">{icon}</span>}
          {title}
        </h3>
      </div>
      <div className="p-4 space-y-3">{children}</div>
    </div>
  );
}

export function KeyValue({
  icon,
  label,
  value,
  hint,
  capitalize,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      {icon && (
        <span className="mt-0.5 flex-shrink-0 text-muted-foreground">{icon}</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <div
          className={cn(
            "text-sm font-medium leading-snug text-foreground break-words",
            capitalize && "capitalize",
          )}
        >
          {value}
        </div>
        {hint && (
          <p className="mt-0.5 text-xs capitalize text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );
}

export function Pill({
  icon,
  children,
  capitalize,
  tone = "muted",
}: {
  icon?: ReactNode;
  children: ReactNode;
  capitalize?: boolean;
  tone?: "muted" | "primary";
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 border-primary/20 text-primary"
      : "bg-muted border-border text-foreground";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-medium",
        toneClass,
        capitalize && "capitalize",
      )}
    >
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}

/* ── ConversationRow ─────────────────────────────────────────────────── */

export interface ConversationRowProps {
  conversation: Conversation;
  variant: "company" | "candidate";
  isActive: boolean;
  onSelect: (conversation: Conversation) => void;
}

export function ConversationRow({
  conversation,
  variant,
  isActive,
  onSelect,
}: ConversationRowProps) {
  const displayName =
    variant === "company"
      ? conversation.candidateName
      : conversation.companyName;
  const subtitle =
    variant === "company"
      ? conversation.jobTitle
      : `${conversation.jobTitle} at ${conversation.companyName}`;
  const hasUnread = conversation.unreadCount > 0;
  const status =
    APPLICATION_STATUS_CONFIG[conversation.applicationStatus] ||
    APPLICATION_STATUS_CONFIG.pending;
  const avatarUrl =
    variant === "candidate"
      ? getCompanyAvatar(displayName)
      : getPersonAvatar(displayName);
  const lastSnippet = conversation.lastMessage?.content ?? "No messages yet";
  const lastTime = conversation.lastMessage
    ? formatTimeAgo(conversation.lastMessage.createdAt)
    : formatTimeAgo(conversation.updatedAt);

  return (
    <button
      type="button"
      onClick={() => onSelect(conversation)}
      aria-current={isActive ? "true" : undefined}
      aria-pressed={isActive}
      className={cn(
        "relative flex w-full items-start gap-3 border-b border-border px-5 py-3.5 text-left transition-colors focus:outline-none focus:bg-muted/40",
        isActive
          ? "border-l-2 border-l-primary bg-muted/40 pl-[18px]"
          : "border-l-2 border-l-transparent pl-5 hover:bg-muted/20",
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-border bg-muted",
          variant === "candidate" && "bg-white p-1",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- backend-served upload / avatar service */}
        <img
          src={avatarUrl}
          alt={displayName}
          className={cn(
            "h-full w-full",
            variant === "candidate" ? "object-contain" : "object-cover",
          )}
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={cn(
              "truncate text-sm font-semibold",
              hasUnread ? "text-foreground" : "text-foreground/90",
            )}
          >
            {displayName}
          </p>
          <span className="flex-shrink-0 text-[10.5px] uppercase tracking-wider text-muted-foreground tabular-nums">
            {lastTime}
          </span>
        </div>

        <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">
          {subtitle}
        </p>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p
            className={cn(
              "min-w-0 flex-1 truncate text-xs",
              hasUnread
                ? "font-medium text-foreground"
                : "text-muted-foreground",
            )}
          >
            {lastSnippet}
          </p>
          <div className="flex flex-shrink-0 items-center gap-1.5">
            <span
              className={cn(
                "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-medium capitalize",
                status.className,
              )}
            >
              {status.label}
            </span>
            {hasUnread && (
              <span
                aria-label={`${conversation.unreadCount} unread`}
                className="inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-none text-primary-foreground tabular-nums"
              >
                {conversation.unreadCount}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

/* ── ConversationListPanel ───────────────────────────────────────────── */

export interface ConversationListPanelProps {
  conversations: Conversation[];
  variant: "company" | "candidate";
  selectedId?: string | null;
  onSelect: (conversation: Conversation) => void;
  emptySlot: ReactNode;
}

export function ConversationListPanel({
  conversations,
  variant,
  selectedId,
  onSelect,
  emptySlot,
}: ConversationListPanelProps) {
  if (conversations.length === 0) return <>{emptySlot}</>;
  return (
    <ul className="divide-y-0">
      {conversations.map((conv) => (
        <li key={conv.id}>
          <ConversationRow
            conversation={conv}
            variant={variant}
            isActive={selectedId === conv.id}
            onSelect={onSelect}
          />
        </li>
      ))}
    </ul>
  );
}

/* ── EmptyConversationPane (placeholder when nothing selected) ───────── */

export function EmptyConversationPane({
  title = "Select a conversation",
  subtitle = "Choose a thread from the list to view messages.",
  icon,
}: {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="grid h-full min-h-[480px] place-items-center rounded-xl border border-dashed border-border bg-card/40 p-12 text-center">
      <div>
        {icon && (
          <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-xl bg-muted/50 text-muted-foreground/60">
            {icon}
          </div>
        )}
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
