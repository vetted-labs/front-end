// Ensure the API URL is absolute (has protocol)
const getApiBaseUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
  // If URL doesn't start with http:// or https://, add https://
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return `https://${url}`;
  }
  return url;
};

const API_BASE_URL = getApiBaseUrl();

interface ApiRequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    message?: string
  ) {
    super(message || `${status} - ${statusText}`);
    this.name = "ApiError";
  }
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requiresAuth = false, headers = {}, body, ...fetchOptions } = options;

  const requestHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  };

  // Only set Content-Type for non-FormData bodies
  // FormData needs the browser to set Content-Type with boundary
  if (!(body instanceof FormData)) {
    requestHeaders["Content-Type"] = "application/json";
  }

  if (requiresAuth) {
    const token =
      localStorage.getItem("authToken") ||
      localStorage.getItem("companyAuthToken");
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  // Prepare body based on type
  let processedBody: any = body;
  if (body && !(body instanceof FormData) && typeof body === 'object') {
    processedBody = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      body: processedBody,
    });

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${(error as Error).message}`);
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string, userType: "candidate" | "company") =>
    apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password, userType }),
    }),

  signup: (data: Record<string, unknown>) =>
    apiRequest("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  logout: () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
  },
};

// Jobs API
export const jobsApi = {
  getAll: (params?: { status?: string; search?: string; companyId?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    if (params?.companyId) queryParams.append("companyId", params.companyId);
    const query = queryParams.toString();
    return apiRequest(`/api/jobs${query ? `?${query}` : ""}`, {
      requiresAuth: false, // Public endpoint - no auth required for browsing jobs
    });
  },

  getById: (id: string) =>
    apiRequest(`/api/jobs/${id}`, {
      requiresAuth: false, // Public endpoint - anyone can view job details
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest("/api/jobs", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/api/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  delete: (id: string) =>
    apiRequest(`/api/jobs/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  apply: (id: string, data: Record<string, unknown>) =>
    apiRequest(`/api/jobs/${id}/apply`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),
};

// Dashboard API
export const dashboardApi = {
  getStats: (companyId?: string) => {
    const queryParams = new URLSearchParams();
    if (companyId) queryParams.append("companyId", companyId);
    const query = queryParams.toString();
    return apiRequest(`/api/dashboard/stats${query ? `?${query}` : ""}`, {
      requiresAuth: true,
    });
  },
};

// Company API
export const companyApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    apiRequest("/api/companies/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () => {
    const token = localStorage.getItem("companyAuthToken");
    return fetch(`${API_BASE_URL}/api/companies/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return res.json();
    });
  },

  updateProfile: (data: Record<string, unknown>) => {
    const token = localStorage.getItem("companyAuthToken");
    return fetch(`${API_BASE_URL}/api/companies/me`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return res.json();
    });
  },

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    const token = localStorage.getItem("companyAuthToken");
    return fetch(`${API_BASE_URL}/api/companies/me/logo`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return res.json();
    });
  },

  getApplications: (params?: {
    status?: string;
    page?: number;
    limit?: number
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      queryParams.append("status", params.status);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    const queryString = queryParams.toString();
    const token = localStorage.getItem("companyAuthToken");
    return fetch(`${API_BASE_URL}/api/companies/applications${queryString ? `?${queryString}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }).then(async (res) => {
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return res.json();
    });
  },
};

// Applications API
export const applicationsApi = {
  getAll: () =>
    apiRequest("/api/candidates/me/applications", {
      requiresAuth: true,
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest("/api/applications", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiRequest(`/api/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
      requiresAuth: true,
    }),

  getJobApplications: (jobId: string, params?: {
    status?: string;
    page?: number;
    limit?: number
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      queryParams.append("status", params.status);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    }

    const queryString = queryParams.toString();
    return apiRequest(
      `/api/applications/jobs/${jobId}${queryString ? `?${queryString}` : ''}`,
      { requiresAuth: true }
    );
  },
};

// Candidate API
export const candidateApi = {
  login: (email: string, password: string) =>
    apiRequest("/api/candidates/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (data: Record<string, unknown>) =>
    apiRequest("/api/candidates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProfile: () =>
    apiRequest("/api/candidates/me", {
      requiresAuth: true,
    }),

  getById: (candidateId: string) =>
    apiRequest(`/api/candidates/${candidateId}`, {
      requiresAuth: false, // Public endpoint - anyone can view candidate profiles
    }),

  updateProfile: (candidateId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/candidates/${candidateId}`, {
      method: "PUT",
      body: data,
      requiresAuth: true,
    }),

  uploadResume: (candidateId: string, file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    return apiRequest(`/api/candidates/${candidateId}/resume`, {
      method: "POST",
      body: formData,
      requiresAuth: true,
    });
  },

  linkedinAuth: (code: string) =>
    apiRequest("/api/auth/linkedin", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),
};

// Expert API
export const expertApi = {
  getProfile: (walletAddress: string) =>
    apiRequest(`/api/experts/profile?wallet=${walletAddress}`),

  getExpertByWallet: (walletAddress: string) =>
    apiRequest(`/api/experts/profile?wallet=${walletAddress}`),

  apply: (data: Record<string, unknown>) =>
    apiRequest("/api/experts/apply", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getGuildDetails: (guildId: string, walletAddress: string) =>
    apiRequest(`/api/experts/guilds/${guildId}?wallet=${walletAddress}`),

  stakeOnProposal: (proposalId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/experts/proposals/${proposalId}/stake`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  endorseApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/experts/applications/${applicationId}/endorse`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reviewGuildApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/experts/guild-applications/${applicationId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveGuildTemplate: (guildId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/experts/guilds/${guildId}/templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getLeaderboard: (params?: { guildId?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.guildId) queryParams.append("guildId", params.guildId);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`/api/experts/reputation/leaderboard${query ? `?${query}` : ""}`);
  },
};

// Notifications API
export const notificationsApi = {
  // Get all notifications for an expert
  getNotifications: (
    walletAddress: string,
    filters?: { isRead?: boolean; type?: string; limit?: number; offset?: number }
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("wallet", walletAddress);
    if (filters?.isRead !== undefined) queryParams.append("isRead", filters.isRead.toString());
    if (filters?.type) queryParams.append("type", filters.type);
    if (filters?.limit) queryParams.append("limit", filters.limit.toString());
    if (filters?.offset) queryParams.append("offset", filters.offset.toString());
    return apiRequest(`/api/experts/notifications?${queryParams.toString()}`);
  },

  // Get unread notification count
  getUnreadCount: (walletAddress: string) =>
    apiRequest(`/api/experts/notifications/unread-count?wallet=${walletAddress}`),

  // Mark a specific notification as read
  markAsRead: (notificationId: string, walletAddress: string) =>
    apiRequest(`/api/experts/notifications/${notificationId}/read`, {
      method: "POST",
      body: JSON.stringify({ wallet: walletAddress }),
    }),

  // Mark all notifications as read
  markAllAsRead: (walletAddress: string) =>
    apiRequest("/api/experts/notifications/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ wallet: walletAddress }),
    }),
};

// Guilds API
export const guildsApi = {
  // Get all guilds (public)
  getAll: () => apiRequest("/api/guilds"),

  // Get public guild details with members overview
  getPublicDetail: (guildId: string) =>
    apiRequest(`/api/guilds/${guildId}`),

  // Get guild's application template
  getApplicationTemplate: (guildId: string) =>
    apiRequest(`/api/guilds/${guildId}/application-template`),

  // Submit guild application (candidate)
  submitApplication: (guildId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/guilds/${guildId}/applications`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  // Get candidate's guild memberships
  getMemberships: (candidateId: string) =>
    apiRequest(`/api/candidates/${candidateId}/guilds`, {
      requiresAuth: true,
    }),

  // Check if user (expert or candidate) is member of specific guild
  checkMembership: (userId: string, guildId: string) =>
    apiRequest(`/api/guilds/membership/${userId}/${guildId}`, {
      requiresAuth: false, // Public endpoint
    }),

  // Get guild's candidate applications (for expert review)
  getCandidateApplications: (guildId: string) =>
    apiRequest(`/api/guilds/${guildId}/candidate-applications`, {
      requiresAuth: true,
    }),

  // Review candidate guild application (expert)
  reviewCandidateApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest(`/api/guilds/candidate-applications/${applicationId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  // Get guild members (experts + candidates)
  getMembers: (guildId: string, params?: { role?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append("role", params.role);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest(`/api/guilds/${guildId}/members${query ? `?${query}` : ""}`);
  },

  // Get guild leaderboard rankings
  getLeaderboard: (guildId: string, params?: { limit?: number; period?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.period) queryParams.append("period", params.period);
    const query = queryParams.toString();
    return apiRequest(`/api/guilds/${guildId}/leaderboard${query ? `?${query}` : ""}`);
  },
};

// Blockchain API
export const blockchainApi = {
  // Staking endpoints
  getStakeBalance: (walletAddress: string) =>
    apiRequest(`/api/blockchain/staking/balance/${walletAddress}`),

  syncStake: (walletAddress: string) =>
    apiRequest("/api/blockchain/staking/sync", {
      method: "POST",
      body: JSON.stringify({ walletAddress }),
    }),

  getUnstakeRequest: (walletAddress: string) =>
    apiRequest(`/api/blockchain/staking/unstake-request/${walletAddress}`),

  getStakingStats: () =>
    apiRequest("/api/blockchain/staking/stats"),

  getStakingHistory: (walletAddress: string, fromBlock?: number) => {
    const queryParams = new URLSearchParams();
    if (fromBlock) queryParams.append("fromBlock", fromBlock.toString());
    const query = queryParams.toString();
    return apiRequest(`/api/blockchain/staking/history/${walletAddress}${query ? `?${query}` : ""}`);
  },

  // Endorsement endpoints
  getEndorsementStatus: (jobId: string, candidateId: string, expertAddress: string) =>
    apiRequest(`/api/blockchain/endorsements/status/${jobId}/${candidateId}/${expertAddress}`),

  getTopEndorsements: (jobId: string, candidateId: string) =>
    apiRequest(`/api/blockchain/endorsements/top/${jobId}/${candidateId}`),

  getAllEndorsements: (jobId: string, candidateId: string) =>
    apiRequest(`/api/blockchain/endorsements/all/${jobId}/${candidateId}`),

  getEndorsementStats: (jobId: string, candidateId: string) =>
    apiRequest(`/api/blockchain/endorsements/stats/${jobId}/${candidateId}`),

  syncEndorsement: (applicationId: string, expertId: string, jobId: string, candidateId: string) =>
    apiRequest("/api/blockchain/endorsements/sync", {
      method: "POST",
      body: JSON.stringify({ applicationId, expertId, jobId, candidateId }),
    }),

  getApplicationsForEndorsement: (guildId: string) =>
    apiRequest(`/api/blockchain/endorsements/applications/${guildId}`),

  // Reputation endpoints
  getReputation: (walletAddress: string) =>
    apiRequest(`/api/blockchain/reputation/${walletAddress}`),

  // Reward endpoints
  getPendingRewards: (walletAddress: string) =>
    apiRequest(`/api/blockchain/rewards/pending/${walletAddress}`),

  getRewardPoolBalance: () =>
    apiRequest("/api/blockchain/rewards/pool"),

  // Token endpoints
  getTokenBalance: (walletAddress: string) =>
    apiRequest(`/api/blockchain/token/balance/${walletAddress}`),

  getTokenInfo: () =>
    apiRequest("/api/blockchain/token/info"),

  // System endpoints
  getBlockchainConfig: () =>
    apiRequest("/api/blockchain/config"),
};

// Proposals API
export const proposalsApi = {
  // Create a new proposal (supports both legacy and structured format)
  createProposal: (data: {
    candidateId?: string;
    guildId: string;
    candidateName: string;
    candidateEmail: string;
    // Legacy field (for backward compatibility)
    proposalText?: string;
    // New structured fields
    yearsOfExperience?: number;
    skillsSummary?: string;
    experienceSummary?: string;
    motivationStatement?: string;
    credibilityEvidence?: string;
    achievements?: string[];
    requiredStake?: number;
    votingDurationDays?: number;
  }) =>
    apiRequest("/api/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get proposals for a guild
  getGuildProposals: (guildId: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    return apiRequest(`/api/proposals/guild/${guildId}${query}`);
  },

  // Get proposal details
  getProposalDetails: (proposalId: string, expertId?: string) => {
    const query = expertId ? `?expertId=${expertId}` : "";
    return apiRequest(`/api/proposals/${proposalId}${query}`);
  },

  // Vote on a proposal (supports both legacy vote and new score)
  voteOnProposal: (
    proposalId: string,
    data: {
      expertId: string;
      // New: Schelling point score (0-100)
      score?: number;
      // Legacy: for/against/abstain (for backward compatibility)
      vote?: "for" | "against" | "abstain";
      stakeAmount: number;
      comment?: string;
      txHash?: string;
    }
  ) =>
    apiRequest(`/api/proposals/${proposalId}/vote`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Close a proposal
  closeProposal: (proposalId: string, approved: boolean) =>
    apiRequest(`/api/proposals/${proposalId}/close`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),

  // Get expert's vote on a proposal
  getExpertVote: (proposalId: string, expertId: string) =>
    apiRequest(`/api/proposals/${proposalId}/vote/${expertId}`),

  // Get proposals assigned to a specific expert
  getAssignedProposals: (expertId: string, guildId?: string) => {
    const query = guildId ? `?guildId=${guildId}` : "";
    return apiRequest(`/api/proposals/assigned/${expertId}${query}`);
  },

  // Check if expert is eligible to vote on a proposal
  checkEligibility: (proposalId: string, expertId: string) =>
    apiRequest(`/api/proposals/${proposalId}/eligibility/${expertId}`),
};

// Utility function to get asset URL
export const getAssetUrl = (path: string) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
};

// Helper functions for Expert Dashboard redesign

/**
 * Calculate total points (reputation + earnings)
 */
export const calculateTotalPoints = (profile: {
  reputation: number;
  totalEarnings: number;
}): number => {
  return profile.reputation + profile.totalEarnings;
};

/**
 * Get notification count from profile data
 * Aggregates pending proposals, unreviewed applications, and guilds with pending proposals
 */
export const getNotificationCount = (profile: {
  pendingTasks: {
    pendingProposalsCount: number;
    unreviewedApplicationsCount: number;
  };
  guilds: Array<{ pendingProposals: number }>;
}): number => {
  const pendingProposalsCount = profile.pendingTasks?.pendingProposalsCount || 0;
  const unreviewedApplicationsCount = profile.pendingTasks?.unreviewedApplicationsCount || 0;
  const guildsWithPendingCount = profile.guilds?.filter(g => g.pendingProposals > 0).length || 0;

  return pendingProposalsCount + unreviewedApplicationsCount + guildsWithPendingCount;
};

/**
 * Check if expert meets staking minimum
 */
export const meetsStakingMinimum = (stakingStatus: {
  meetsMinimum?: boolean;
  stakedAmount?: string;
  minimumRequired?: string;
}): boolean => {
  if (typeof stakingStatus.meetsMinimum === "boolean") {
    return stakingStatus.meetsMinimum;
  }

  // Fallback: compare stakedAmount with minimumRequired
  if (stakingStatus.stakedAmount && stakingStatus.minimumRequired) {
    const staked = parseFloat(stakingStatus.stakedAmount);
    const minimum = parseFloat(stakingStatus.minimumRequired);
    return staked >= minimum;
  }

  return false;
};
