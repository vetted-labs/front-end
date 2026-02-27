export type TeamMemberRole = "admin" | "manager" | "recruiter";
export type TeamMemberStatus = "pending" | "active" | "inactive";

export interface TeamMember {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: TeamMemberRole;
  status: TeamMemberStatus;
  invitedBy: string | null;
  invitedAt: string;
  acceptedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
