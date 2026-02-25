export type ConversationStatus = "active" | "archived";

export type MessageType = "text" | "meeting_scheduled" | "meeting_response" | "system";

export type MeetingStatus = "pending" | "accepted" | "declined" | "new_time_proposed";

export interface MeetingResponse {
  status: MeetingStatus;
  respondedAt?: string;
  proposedTime?: string;
  proposedNote?: string;
}

export interface MeetingDetails {
  id?: string;
  title: string;
  scheduledAt: string;
  duration: number; // minutes
  provider: "google_meet" | "calendly" | "custom";
  meetingUrl: string;
  status?: MeetingStatus;
  response?: MeetingResponse;
}

export interface UpcomingMeeting {
  id: string;
  title: string;
  scheduledAt: string;
  duration: number;
  provider: "google_meet" | "calendly" | "custom";
  meetingUrl: string;
  status: MeetingStatus;
  conversationId: string;
  counterpartyName: string;
  counterpartyType: "company" | "candidate";
  jobTitle: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: "company" | "candidate";
  senderName: string;
  content: string;
  type: MessageType;
  meetingDetails?: MeetingDetails;
  createdAt: string;
  readAt?: string;
}

export interface Conversation {
  id: string;
  applicationId: string;
  jobId: string;
  jobTitle: string;
  companyId: string;
  companyName: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  candidateHeadline?: string;
  candidateExperienceLevel?: string;
  candidateResumeUrl?: string;
  candidateLinkedIn?: string;
  candidateGithub?: string;
  applicationStatus: string;
  status: ConversationStatus;
  lastMessage?: {
    content: string;
    senderType: "company" | "candidate";
    createdAt: string;
  };
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UnreadCounts {
  total: number;
  byConversation: Record<string, number>;
}
