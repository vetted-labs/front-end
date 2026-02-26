import type { ExpertRole } from "./guild";

export type PostTag = "discussion" | "question" | "insight" | "job_related";
export type PostSortMode = "hot" | "new" | "top";
export type TopTimeWindow = "week" | "month" | "all";

export type ReactionType = "upvote" | "insightful" | "helpful" | "bookmark";

export type PollChoiceMode = "single" | "multiple";

export type ModerationAction = "pin" | "unpin" | "close" | "reopen" | "delete" | "mark_duplicate";

export interface ReactionSummary {
  upvote: number;
  insightful: number;
  helpful: number;
  bookmark: number;
  userReactions: ReactionType[];
}

export interface PostAuthor {
  id: string;
  type: "expert" | "candidate";
  fullName: string;
  walletAddress?: string;
  reputation: number;
  guildRole?: string;
  expertRole?: ExpertRole;
}

export interface GuildPost {
  id: string;
  guildId: string;
  author: PostAuthor;
  title: string;
  body: string;
  tag: PostTag;
  upvoteCount: number;
  replyCount: number;
  isPinned: boolean;
  isClosed: boolean;
  hasVoted: boolean;
  scoreHidden: boolean;
  acceptedReplyId?: string;
  reactions: ReactionSummary;
  poll?: PostPoll;
  createdAt: string;
  updatedAt: string;
}

export interface GuildPostReply {
  id: string;
  postId: string;
  author: PostAuthor;
  body: string;
  upvoteCount: number;
  hasVoted: boolean;
  scoreHidden: boolean;
  parentReplyId?: string;
  depth: number;
  isAccepted: boolean;
  reactions: ReactionSummary;
  childCount: number;
  children?: GuildPostReply[];
  createdAt: string;
}

export interface CreatePostPayload {
  title: string;
  body: string;
  tag: PostTag;
  poll?: CreatePollPayload;
}

export interface CreateReplyPayload {
  body: string;
  parentReplyId?: string;
}

export interface VotePayload {
  targetId: string;
  targetType: "post" | "reply";
}

export interface GuildFeedResponse {
  data: GuildPost[];
  total: number;
}

// Reactions
export interface ToggleReactionPayload {
  targetId: string;
  targetType: "post" | "reply";
  reaction: ReactionType;
}

export interface ToggleReactionResponse {
  toggled: boolean;
  reactions: ReactionSummary;
}

// Polls
export interface PollOption {
  id: string;
  text: string;
  voteCount: number;
  hasVoted: boolean;
}

export interface PostPoll {
  id: string;
  choiceMode: PollChoiceMode;
  options: PollOption[];
  totalVotes: number;
  expiresAt?: string;
  hasVoted: boolean;
}

export interface CreatePollPayload {
  choiceMode: PollChoiceMode;
  options: string[];
  expiresInHours?: number;
}

export interface CastPollVotePayload {
  optionIds: string[];
}

export interface CastPollVoteResponse {
  poll: PostPoll;
}

// Moderation
export interface ModerationPayload {
  action: ModerationAction;
  duplicateOfPostId?: string;
}

// Privileges
export interface FeedPrivileges {
  canPost: boolean;
  canReply: boolean;
  canEditOthers: boolean;
  canMarkDuplicate: boolean;
  canPinUnpin: boolean;
  canCloseReopen: boolean;
  canAcceptOnBehalf: boolean;
  canDelete: boolean;
}
