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
  _isRetry?: boolean; // Internal flag to prevent infinite refresh loops
  rawEnvelope?: boolean;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: Record<string, unknown>,
    message?: string
  ) {
    super(message || `${status} - ${statusText}`);
    this.name = "ApiError";
    // Make response property available for compatibility with error handling
    this.response = { status, statusText, data };
  }

  response: {
    status: number;
    statusText: string;
    data: Record<string, unknown> | undefined;
  };
}

/**
 * 🔐 SECURITY: Sanitize error message to prevent XSS via API responses
 * Strips HTML tags and limits length
 */
export function sanitizeErrorMessage(message: unknown): string {
  if (typeof message !== "string") return "An error occurred";
  // Strip HTML tags
  const stripped = message.replace(/<[^>]*>/g, "");
  // Limit length
  return stripped.slice(0, 500);
}

// Track whether a token refresh is in progress to prevent concurrent refreshes
let refreshPromise: Promise<boolean> | null = null;

/**
 * 🔐 SECURITY: Attempt to refresh the access token using the stored refresh token
 * Returns true if refresh succeeded, false otherwise
 */
async function attemptTokenRefresh(): Promise<boolean> {
  // If a refresh is already in progress, wait for it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (!refreshToken) return false;

      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Refresh failed - clear auth state
        if (response.status === 401) {
          localStorage.removeItem("refreshToken");
        }
        return false;
      }

      const data = await response.json();

      // Store new tokens
      const userType = localStorage.getItem("userType");
      if (userType === "company") {
        localStorage.setItem("companyAuthToken", data.accessToken);
      } else {
        localStorage.setItem("authToken", data.accessToken);
      }
      localStorage.setItem("refreshToken", data.refreshToken);

      // Notify AuthContext to re-sync state from localStorage
      window.dispatchEvent(new Event('auth-token-refreshed'));

      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiRequest<T = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { requiresAuth = false, _isRetry = false, headers = {}, body, ...fetchOptions } = options;

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
  let processedBody: BodyInit | null | undefined = body;
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
      // 🔐 SECURITY: Auto-refresh on 401 (token expired)
      if (response.status === 401 && requiresAuth && !_isRetry) {
        const refreshed = await attemptTokenRefresh();
        if (refreshed) {
          // Retry the original request with new token
          return apiRequest<T>(endpoint, { ...options, _isRetry: true });
        }
      }

      // Try to parse error response body
      let errorData: Record<string, unknown> = {};
      try {
        const text = await response.text();
        errorData = text ? JSON.parse(text) : {};
      } catch {
        // If parsing fails, leave errorData empty
      }

      throw new ApiError(response.status, response.statusText, errorData);
    }

    const data = await response.json();

    // Reject { success: false } responses that slipped through with a 2xx status
    if (
      data !== null &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      data.success === false
    ) {
      throw new ApiError(
        response.status,
        response.statusText,
        data,
        sanitizeErrorMessage(data.error || data.message || 'Request failed')
      );
    }

    // Auto-unwrap { success: true, data: T } envelope from backend
    if (
      !options.rawEnvelope &&
      data !== null &&
      typeof data === "object" &&
      !Array.isArray(data) &&
      "success" in data &&
      "data" in data &&
      data.success === true
    ) {
      return data.data as T;
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new Error(`Network error: ${(error as Error).message}`);
  }
}

// Auth API
export const authApi = {
  login: (email: string, password: string, userType: "candidate" | "company") => {
    // Route to correct backend endpoint based on user type
    const endpoint = userType === "company" ? "/api/companies/login" : "/api/candidates/login";
    return apiRequest<import("@/types").AuthResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  signup: (data: Record<string, unknown> & { userType?: string }) => {
    // Route to correct backend endpoint based on user type
    const endpoint = data.userType === "company" ? "/api/companies" : "/api/candidates";
    return apiRequest<import("@/types").AuthResponse>(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // 🔐 SECURITY: Revoke refresh token on backend before clearing local state
  logout: async () => {
    try {
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Best-effort: clear local state even if backend call fails
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("companyAuthToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userType");
    localStorage.removeItem("candidateId");
    localStorage.removeItem("companyId");
    localStorage.removeItem("candidateEmail");
    localStorage.removeItem("companyEmail");
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
    return apiRequest<import("@/types").Job[]>(`/api/jobs${query ? `?${query}` : ""}`, {
      requiresAuth: false, // Public endpoint - no auth required for browsing jobs
    });
  },

  getById: (id: string) =>
    apiRequest<import("@/types").Job>(`/api/jobs/${id}`, {
      requiresAuth: false, // Public endpoint - anyone can view job details
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest<import("@/types").Job>("/api/jobs", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiRequest<import("@/types").Job>(`/api/jobs/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  delete: (id: string) =>
    apiRequest<void>(`/api/jobs/${id}`, {
      method: "DELETE",
      requiresAuth: true,
    }),

  apply: (id: string, data: Record<string, unknown>) =>
    apiRequest<{ id: string }>(`/api/jobs/${id}/apply`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),
};

// Dashboard API - uses /api/jobs/stats endpoint on backend
export const dashboardApi = {
  getStats: (companyId?: string) => {
    const queryParams = new URLSearchParams();
    if (companyId) queryParams.append("companyId", companyId);
    const query = queryParams.toString();
    return apiRequest<import("@/types").DashboardStats>(`/api/jobs/stats${query ? `?${query}` : ""}`, {
      requiresAuth: true,
    });
  },
};

// Company API
export const companyApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest<import("@/types").AuthResponse>("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  login: (email: string, password: string) =>
    apiRequest<import("@/types").AuthResponse>("/api/companies/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  getProfile: () =>
    apiRequest<import("@/types").CompanyProfile>("/api/companies/me", { requiresAuth: true }),

  updateProfile: (data: Record<string, unknown>) =>
    apiRequest<import("@/types").CompanyProfile>("/api/companies/me", {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  uploadLogo: (file: File) => {
    const formData = new FormData();
    formData.append("logo", file);
    return apiRequest<{ logoUrl: string }>("/api/companies/me/logo", {
      method: "POST",
      body: formData,
      requiresAuth: true,
    });
  },

  getApplications: (params?: {
    status?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status && params.status !== "all") {
      queryParams.append("status", params.status);
    }
    if (params?.page) {
      queryParams.append("page", params.page.toString());
    }
    if (params?.limit) {
      queryParams.append("limit", params.limit.toString());
    }
    const queryString = queryParams.toString();
    return apiRequest<{ applications: import("@/types").CompanyApplication[]; total: number }>(
      `/api/companies/applications${queryString ? `?${queryString}` : ""}`,
      { requiresAuth: true }
    );
  },
};

// Applications API
export const applicationsApi = {
  getAll: () =>
    apiRequest<{ applications: import("@/types").CandidateApplication[] }>("/api/candidates/me/applications", {
      requiresAuth: true,
    }),

  create: (data: Record<string, unknown>) =>
    apiRequest<{ id: string }>("/api/applications", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiRequest<{ id: string; status: string }>(`/api/applications/${id}/status`, {
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
    return apiRequest<{ applications: import("@/types").CompanyApplication[]; total: number }>(
      `/api/applications/jobs/${jobId}${queryString ? `?${queryString}` : ''}`,
      { requiresAuth: true }
    );
  },
};

// Candidate API
export const candidateApi = {
  login: (email: string, password: string) =>
    apiRequest<import("@/types").AuthResponse>("/api/candidates/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  signup: (data: Record<string, unknown>) =>
    apiRequest<import("@/types").AuthResponse>("/api/candidates", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProfile: () =>
    apiRequest<import("@/types").CandidateProfile>("/api/candidates/me", {
      requiresAuth: true,
    }),

  getById: (candidateId: string) =>
    apiRequest<import("@/types").CandidateProfile>(`/api/candidates/${candidateId}`, {
      requiresAuth: false, // Public endpoint - anyone can view candidate profiles
    }),

  updateProfile: (candidateId: string, data: Record<string, unknown>) =>
    apiRequest<import("@/types").CandidateProfile>(`/api/candidates/${candidateId}`, {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  uploadResume: (candidateId: string, file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    return apiRequest<{ resumeUrl: string }>(`/api/candidates/${candidateId}/resume`, {
      method: "POST",
      body: formData,
      requiresAuth: true,
    });
  },

  linkedinAuth: (code: string) =>
    apiRequest<import("@/types").AuthResponse>("/api/auth/linkedin", {
      method: "POST",
      body: JSON.stringify({ code }),
    }),

  getGuildApplications: () =>
    apiRequest<import("@/types").GuildApplicationSummary[]>("/api/candidates/me/guild-applications", { requiresAuth: true }),
};

// Expert API
export const expertApi = {
  getProfile: (walletAddress: string) =>
    apiRequest<import("@/types").ExpertProfile>(`/api/experts/profile?wallet=${walletAddress}`),

  apply: (data: Record<string, unknown>) =>
    apiRequest<{ id: string; status: string }>("/api/experts/apply", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getGuildApplicationTemplate: (
    guildId: string,
    stage: "general" | "level",
    level?: string
  ) => {
    const queryParams = new URLSearchParams();
    queryParams.append("stage", stage);
    if (level) queryParams.append("level", level);
    const query = queryParams.toString();
    return apiRequest<import("@/types").GuildApplicationTemplate>(`/api/experts/guilds/${guildId}/application-template?${query}`);
  },

  getGuildDetails: (guildId: string, walletAddress: string) =>
    apiRequest<import("@/types").ExpertGuild>(`/api/experts/guilds/${encodeURIComponent(guildId)}?wallet=${encodeURIComponent(walletAddress)}`),

  // Note: Backend still uses /proposals/ path for staking endpoint
  stakeOnApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/experts/proposals/${applicationId}/stake`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  endorseApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/experts/applications/${applicationId}/endorse`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  reviewGuildApplication: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest<{ message?: string }>(`/api/experts/guild-applications/${applicationId}/review`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  saveGuildTemplate: (guildId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/experts/guilds/${guildId}/templates`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  uploadResume: (expertId: string, file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    return apiRequest<{ resumeUrl: string }>(`/api/experts/${expertId}/resume`, {
      method: "POST",
      body: formData,
    });
  },

  updateProfile: (walletAddress: string, data: Record<string, unknown>) =>
    apiRequest<import("@/types").ExpertProfile>(`/api/experts/profile?wallet=${walletAddress}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  getLeaderboard: (params?: { guildId?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.guildId) queryParams.append("guildId", params.guildId);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<import("@/types").LeaderboardEntry[]>(`/api/experts/reputation/leaderboard${query ? `?${query}` : ""}`);
  },

  getReputationTimeline: (walletAddress: string, params?: { guildId?: string; reason?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams({ wallet: walletAddress });
    if (params?.guildId) q.append("guildId", params.guildId);
    if (params?.reason) q.append("reason", params.reason);
    if (params?.dateFrom) q.append("dateFrom", params.dateFrom);
    if (params?.dateTo) q.append("dateTo", params.dateTo);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    return apiRequest<import("@/types").ReputationTimeline>(`/api/experts/reputation/timeline?${q.toString()}`);
  },

  getEarningsBreakdown: (walletAddress: string, params?: { guildId?: string; type?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams({ wallet: walletAddress });
    if (params?.guildId) q.append("guildId", params.guildId);
    if (params?.type) q.append("type", params.type);
    if (params?.dateFrom) q.append("dateFrom", params.dateFrom);
    if (params?.dateTo) q.append("dateTo", params.dateTo);
    if (params?.page) q.append("page", params.page.toString());
    if (params?.limit) q.append("limit", params.limit.toString());
    return apiRequest<import("@/types").EarningsBreakdown>(`/api/experts/earnings/breakdown?${q.toString()}`);
  },

  getProposalRewardDetail: (walletAddress: string, proposalId: string) =>
    apiRequest<import("@/types").RewardDetail>(`/api/experts/proposals/${proposalId}/reward-detail?wallet=${walletAddress}`),
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
    return apiRequest<import("@/types").NotificationsResponse>(`/api/experts/notifications?${queryParams.toString()}`);
  },

  // Get unread notification count
  getUnreadCount: (walletAddress: string) =>
    apiRequest<import("@/types").NotificationUnreadCount>(`/api/experts/notifications/unread-count?wallet=${walletAddress}`),

  // Mark a specific notification as read
  markAsRead: (notificationId: string, walletAddress: string) =>
    apiRequest<{ success: boolean }>(`/api/experts/notifications/${notificationId}/read`, {
      method: "POST",
      body: JSON.stringify({ wallet: walletAddress }),
    }),

  // Mark all notifications as read
  markAllAsRead: (walletAddress: string) =>
    apiRequest<{ success: boolean }>("/api/experts/notifications/mark-all-read", {
      method: "POST",
      body: JSON.stringify({ wallet: walletAddress }),
    }),
};

// Guilds API
export const guildsApi = {
  // Get all guilds (public)
  getAll: () => apiRequest<import("@/types").Guild[]>("/api/guilds"),

  // Get public guild details with members overview
  getPublicDetail: (guildId: string) =>
    apiRequest<import("@/types").GuildPublicDetail>(`/api/guilds/${encodeURIComponent(guildId)}`),

  // Get guild's application template
  getApplicationTemplate: (guildId: string, jobId?: string) => {
    const query = jobId ? `?jobId=${encodeURIComponent(jobId)}` : "";
    return apiRequest<import("@/types").GuildApplicationTemplate>(`/api/guilds/${encodeURIComponent(guildId)}/application-template${query}`);
  },

  // Submit guild application (candidate)
  submitApplication: (guildId: string, data: Record<string, unknown>) =>
    apiRequest<{ id: string }>(`/api/guilds/${encodeURIComponent(guildId)}/applications`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  // Get candidate's guild memberships
  getMemberships: (candidateId: string) =>
    apiRequest<import("@/types").Guild[]>(`/api/candidates/${candidateId}/guilds`, {
      requiresAuth: true,
    }),

  // Check if user (expert or candidate) is member of specific guild
  checkMembership: (userId: string, guildId: string) =>
    apiRequest<import("@/types").GuildMembershipCheck>(`/api/guilds/membership/${encodeURIComponent(userId)}/${encodeURIComponent(guildId)}`, {
      requiresAuth: false, // Public endpoint
    }),

  // Get guild's candidate applications (for expert review)
  getCandidateApplications: (guildId: string, wallet?: string) => {
    const query = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
    return apiRequest<import("@/types").GuildApplicationSummary[]>(`/api/guilds/${encodeURIComponent(guildId)}/candidate-applications${query}`);
  },

  // Review candidate guild application (expert)
  reviewCandidateApplication: (applicationId: string, data: Record<string, unknown>) => {
    const wallet = (data.wallet || data.walletAddress) as string;
    const query = wallet ? `?wallet=${encodeURIComponent(wallet)}` : "";
    return apiRequest<{ message?: string }>(`/api/guilds/candidate-applications/${applicationId}/review${query}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get guild members (experts + candidates)
  getMembers: (guildId: string, params?: { role?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.append("role", params.role);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<{ experts: import("@/types").ExpertMember[]; candidates: import("@/types").CandidateMember[] }>(`/api/guilds/${encodeURIComponent(guildId)}/members${query ? `?${query}` : ""}`);
  },

  // Get guild leaderboard rankings
  getLeaderboard: (guildId: string, params?: { limit?: number; period?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.period) queryParams.append("period", params.period);
    const query = queryParams.toString();
    return apiRequest<import("@/types").GuildLeaderboardEntry[]>(`/api/guilds/${encodeURIComponent(guildId)}/leaderboard${query ? `?${query}` : ""}`);
  },

  // Get guild averages (for comparison stats)
  getAverages: (guildId: string) =>
    apiRequest<import("@/types").GuildAverages>(`/api/guilds/${encodeURIComponent(guildId)}/averages`),

  // Get a member's recent activity in a guild
  getMemberActivity: (guildId: string, memberId: string) =>
    apiRequest<import("@/types").ExpertActivity[]>(`/api/guilds/${encodeURIComponent(guildId)}/members/${encodeURIComponent(memberId)}/activity`),
};

// Helper: build auth headers for feed endpoints.
// Experts use wallet-based auth (no JWT), so we pass wallet/expertId via headers.
// Candidates/companies use the standard Bearer token.
function getFeedAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {};
  const token = typeof window !== "undefined"
    ? localStorage.getItem("authToken") || localStorage.getItem("companyAuthToken")
    : null;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  if (typeof window !== "undefined") {
    const walletAddress = localStorage.getItem("walletAddress");
    const expertId = localStorage.getItem("expertId");
    if (walletAddress) headers["X-Wallet-Address"] = walletAddress;
    if (expertId) headers["X-Expert-Id"] = expertId;
  }
  return headers;
}

// Guild Feed API (discussion posts, replies, votes)
export const guildFeedApi = {
  // Get posts for a guild (paginated, with sort/filter)
  getPosts: async (
    guildId: string,
    params?: {
      sort?: import("@/types").PostSortMode;
      tag?: import("@/types").PostTag | "all";
      timeWindow?: import("@/types").TopTimeWindow;
      page?: number;
      limit?: number;
    }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.tag && params.tag !== "all") queryParams.append("tag", params.tag);
    if (params?.timeWindow) queryParams.append("timeWindow", params.timeWindow);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    // Backend returns { success, data: Post[], total }. We use rawEnvelope to
    // skip auto-unwrap so we can access `total` for server-side pagination.
    const endpoint = `/api/guilds/${encodeURIComponent(guildId)}/posts${query ? `?${query}` : ""}`;
    const json = await apiRequest<{ success?: boolean; data?: import("@/types").GuildPost[]; total?: number }>(endpoint, {
      headers: getFeedAuthHeaders(),
      rawEnvelope: true,
    });
    const posts = json.data ?? [];
    const total = json.total ?? posts.length;
    return { data: posts, total } as import("@/types").GuildFeedResponse;
  },

  // Get a single post by ID
  getPost: (guildId: string, postId: string) =>
    apiRequest<import("@/types").GuildPost>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}`,
      { headers: getFeedAuthHeaders() }
    ),

  // Create a new post (auth required, member only)
  createPost: (guildId: string, data: import("@/types").CreatePostPayload) =>
    apiRequest<import("@/types").GuildPost>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Update a post (author only)
  updatePost: (guildId: string, postId: string, data: Partial<import("@/types").CreatePostPayload>) =>
    apiRequest<import("@/types").GuildPost>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}`,
      { method: "PUT", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Delete a post (author or guild lead)
  deletePost: (guildId: string, postId: string) =>
    apiRequest<{ success: boolean }>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}`,
      { method: "DELETE", headers: getFeedAuthHeaders() }
    ),

  // Get replies for a post
  getReplies: async (
    guildId: string,
    postId: string,
    params?: { sort?: "new" | "top"; page?: number; limit?: number; parentReplyId?: string }
  ) => {
    const queryParams = new URLSearchParams();
    if (params?.sort) queryParams.append("sort", params.sort);
    if (params?.page) queryParams.append("page", params.page.toString());
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.parentReplyId) queryParams.append("parentReplyId", params.parentReplyId);
    const query = queryParams.toString();
    const endpoint = `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/replies${query ? `?${query}` : ""}`;
    const json = await apiRequest<{ success?: boolean; data?: import("@/types").GuildPostReply[]; total?: number }>(endpoint, {
      headers: getFeedAuthHeaders(),
      rawEnvelope: true,
    });
    const replies = json.data ?? [];
    const total = json.total ?? replies.length;
    return { data: replies, total } as { data: import("@/types").GuildPostReply[]; total: number };
  },

  // Create a reply (auth required, member only)
  createReply: (guildId: string, postId: string, data: import("@/types").CreateReplyPayload) =>
    apiRequest<import("@/types").GuildPostReply>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/replies`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Delete a reply (author or guild lead)
  deleteReply: (guildId: string, postId: string, replyId: string) =>
    apiRequest<{ success: boolean }>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/replies/${encodeURIComponent(replyId)}`,
      { method: "DELETE", headers: getFeedAuthHeaders() }
    ),

  // Toggle vote on a post or reply
  vote: (guildId: string, data: import("@/types").VotePayload) =>
    apiRequest<{ voted: boolean; newCount: number }>(
      `/api/guilds/${encodeURIComponent(guildId)}/votes`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Toggle reaction on a post or reply
  toggleReaction: (guildId: string, data: import("@/types").ToggleReactionPayload) =>
    apiRequest<import("@/types").ToggleReactionResponse>(
      `/api/guilds/${encodeURIComponent(guildId)}/reactions`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Accept a reply as the answer
  acceptAnswer: (guildId: string, postId: string, data: { replyId: string }) =>
    apiRequest<{ acceptedReplyId: string }>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/accept`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Remove accepted answer
  removeAcceptedAnswer: (guildId: string, postId: string) =>
    apiRequest<{ success: boolean }>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/accept`,
      { method: "DELETE", headers: getFeedAuthHeaders() }
    ),

  // Cast a vote on a poll
  castPollVote: (guildId: string, postId: string, data: import("@/types").CastPollVotePayload) =>
    apiRequest<import("@/types").CastPollVoteResponse>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/poll/vote`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),

  // Moderate a post (pin, close, delete, etc.)
  moderatePost: (guildId: string, postId: string, data: import("@/types").ModerationPayload) =>
    apiRequest<{ success: boolean }>(
      `/api/guilds/${encodeURIComponent(guildId)}/posts/${encodeURIComponent(postId)}/moderate`,
      { method: "POST", body: JSON.stringify(data), headers: getFeedAuthHeaders() }
    ),
};

// Blockchain API
export const blockchainApi = {
  // Staking endpoints
  getStakeBalance: (walletAddress: string, blockchainGuildId?: string) =>
    apiRequest<import("@/types").StakeBalance>(`/api/blockchain/staking/balance/${walletAddress}${blockchainGuildId ? `/${blockchainGuildId}` : ''}`),

  getExpertGuildStakes: (walletAddress: string) =>
    apiRequest<import("@/types").GuildStakeInfo[]>(`/api/blockchain/staking/guilds/${walletAddress}`),

  syncStake: (walletAddress: string, guildId?: string) =>
    apiRequest<{ success: boolean }>("/api/blockchain/staking/sync", {
      method: "POST",
      body: JSON.stringify({ walletAddress, guildId }),
    }),

  getUnstakeRequest: (walletAddress: string) =>
    apiRequest<import("@/types").UnstakeRequest | null>(`/api/blockchain/staking/unstake-request/${walletAddress}`),

  getStakingStats: () =>
    apiRequest<import("@/types").StakingStats>("/api/blockchain/staking/stats"),

  getStakingHistory: (walletAddress: string, fromBlock?: number) => {
    const queryParams = new URLSearchParams();
    if (fromBlock) queryParams.append("fromBlock", fromBlock.toString());
    const query = queryParams.toString();
    return apiRequest<Array<{ type: string; amount: string; timestamp: string; txHash: string }>>(`/api/blockchain/staking/history/${walletAddress}${query ? `?${query}` : ""}`);
  },

  // Endorsement endpoints
  getEndorsementStatus: (jobId: string, candidateId: string, expertAddress: string) =>
    apiRequest<import("@/types").EndorsementStatus>(`/api/blockchain/endorsements/status/${jobId}/${candidateId}/${expertAddress}`),

  getTopEndorsements: (jobId: string, candidateId: string) =>
    apiRequest<import("@/types").EndorsementInfo[]>(`/api/blockchain/endorsements/top/${jobId}/${candidateId}`),

  getAllEndorsements: (jobId: string, candidateId: string) =>
    apiRequest<import("@/types").EndorsementInfo[]>(`/api/blockchain/endorsements/all/${jobId}/${candidateId}`),

  getEndorsementStats: (jobId: string, candidateId: string) =>
    apiRequest<import("@/types").EndorsementStats>(`/api/blockchain/endorsements/stats/${jobId}/${candidateId}`),

  syncEndorsement: (applicationId: string, expertId: string, jobId: string, candidateId: string) =>
    apiRequest<{ success: boolean }>("/api/blockchain/endorsements/sync", {
      method: "POST",
      body: JSON.stringify({ applicationId, expertId, jobId, candidateId }),
    }),

  getApplicationsForEndorsement: (guildId: string) =>
    apiRequest<import("@/types").GuildJobApplication[]>(`/api/blockchain/endorsements/applications/${guildId}`),

  getExpertEndorsements: (walletAddress: string, params?: { status?: string; limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    const query = queryParams.toString();
    return apiRequest<import("@/types").ActiveEndorsement[]>(`/api/blockchain/endorsements/expert/${walletAddress}${query ? `?${query}` : ""}`);
  },

  // Reputation endpoints
  getReputation: (walletAddress: string) =>
    apiRequest<import("@/types").ReputationScore>(`/api/blockchain/reputation/${walletAddress}`),

  // Reward endpoints
  getPendingRewards: (walletAddress: string) =>
    apiRequest<import("@/types").PendingRewards>(`/api/blockchain/rewards/pending/${walletAddress}`),

  getRewardPoolBalance: () =>
    apiRequest<import("@/types").RewardPoolBalance>("/api/blockchain/rewards/pool"),

  // Token endpoints
  getTokenBalance: (walletAddress: string) =>
    apiRequest<import("@/types").TokenBalance>(`/api/blockchain/token/balance/${walletAddress}`),

  getTokenInfo: () =>
    apiRequest<import("@/types").TokenInfo>("/api/blockchain/token/info"),

  // System endpoints
  getBlockchainConfig: () =>
    apiRequest<import("@/types").BlockchainConfig>("/api/blockchain/config"),

  // Wallet verification (SIWE)
  getWalletChallenge: (address: string) =>
    apiRequest<import("@/types").WalletChallenge>("/api/blockchain/wallet/challenge", {
      method: "POST",
      body: JSON.stringify({ address }),
    }),

  verifyWallet: (address: string, signature: string, message: string) =>
    apiRequest<import("@/types").WalletVerifyResponse>("/api/blockchain/wallet/verify", {
      method: "POST",
      body: JSON.stringify({ address, signature, message }),
    }),

  isWalletVerified: (walletAddress: string) =>
    apiRequest<import("@/types").WalletVerification>(`/api/blockchain/wallet/verified/${walletAddress}`),
};

// Maps camelCase API response to snake_case GuildApplication type
function mapProposalToGuildApplication(raw: Record<string, unknown>): import("@/types").GuildApplication {
  return {
    id: raw.id as string,
    candidate_name: (raw.candidateName ?? raw.candidate_name ?? "") as string,
    candidate_email: (raw.candidateEmail ?? raw.candidate_email ?? "") as string,
    candidate_id: (raw.candidateId ?? raw.candidate_id) as string | undefined,
    years_of_experience: raw.yearsOfExperience != null || raw.years_of_experience != null
      ? Number(raw.yearsOfExperience ?? raw.years_of_experience) : undefined,
    skills_summary: (raw.skillsSummary ?? raw.skills_summary) as string | undefined,
    experience_summary: (raw.experienceSummary ?? raw.experience_summary) as string | undefined,
    motivation_statement: (raw.motivationStatement ?? raw.motivation_statement) as string | undefined,
    credibility_evidence: (raw.credibilityEvidence ?? raw.credibility_evidence) as string | undefined,
    achievements: (raw.achievements ?? []) as string[],
    proposal_text: (raw.proposalText ?? raw.proposal_text) as string | undefined,
    guild_id: (raw.guildId ?? raw.guild_id ?? "") as string,
    guild_name: (raw.guildName ?? raw.guild_name ?? "") as string,
    required_stake: Number(raw.requiredStake ?? raw.required_stake ?? 0),
    status: (raw.status ?? "") as string,
    created_at: (raw.createdAt ?? raw.created_at ?? "") as string,
    voting_deadline: (raw.votingDeadline ?? raw.voting_deadline ?? "") as string,
    vote_count: Number(raw.voteCount ?? raw.vote_count ?? 0),
    votes_for_count: Number(raw.votesForCount ?? raw.votes_for_count ?? 0),
    votes_against_count: Number(raw.votesAgainstCount ?? raw.votes_against_count ?? 0),
    total_stake_for: raw.totalStakeFor != null || raw.total_stake_for != null
      ? Number(raw.totalStakeFor ?? raw.total_stake_for) : undefined,
    total_stake_against: raw.totalStakeAgainst != null || raw.total_stake_against != null
      ? Number(raw.totalStakeAgainst ?? raw.total_stake_against) : undefined,
    assigned_reviewer_count: raw.assignedReviewerCount != null || raw.assigned_reviewer_count != null
      ? Number(raw.assignedReviewerCount ?? raw.assigned_reviewer_count) : undefined,
    voting_phase: (raw.votingPhase ?? raw.voting_phase) as string | undefined,
    consensus_score: raw.consensusScore != null || raw.consensus_score != null
      ? Number(raw.consensusScore ?? raw.consensus_score) : undefined,
    finalized: Boolean(raw.finalized),
    outcome: (raw.outcome ?? (raw.status === "approved" ? "approved" : raw.status === "rejected" ? "rejected" : undefined)) as import("@/types").GuildApplicationOutcome | undefined,
    finalized_at: (raw.finalizedAt ?? raw.finalized_at) as string | undefined,
    total_rewards_distributed: raw.totalRewardsDistributed != null || raw.total_rewards_distributed != null
      ? Number(raw.totalRewardsDistributed ?? raw.total_rewards_distributed) : undefined,
    is_assigned_reviewer: Boolean(raw.isAssignedReviewer ?? raw.is_assigned_reviewer ?? false),
    has_voted: Boolean(raw.hasVoted ?? raw.has_voted ?? false),
    my_vote_score: raw.myVoteScore != null || raw.my_vote_score != null
      ? Number(raw.myVoteScore ?? raw.my_vote_score) : undefined,
    alignment_distance: raw.alignmentDistance != null || raw.alignment_distance != null
      ? Number(raw.alignmentDistance ?? raw.alignment_distance) : undefined,
    my_reputation_change: raw.myReputationChange != null || raw.my_reputation_change != null
      ? Number(raw.myReputationChange ?? raw.my_reputation_change) : undefined,
    my_reward_amount: raw.myRewardAmount != null || raw.my_reward_amount != null
      ? Number(raw.myRewardAmount ?? raw.my_reward_amount) : undefined,
  };
}

// Guild Applications API (candidate/expert vetting)
export const guildApplicationsApi = {
  // Create a new guild application (supports both legacy and structured format)
  create: (data: {
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
    apiRequest<{ id: string }>("/api/proposals", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Get guild applications for a guild
  getByGuild: async (guildId: string, status?: string) => {
    const query = status ? `?status=${status}` : "";
    const data = await apiRequest<Record<string, unknown>[]>(`/api/proposals/guild/${guildId}${query}`);
    return data.map(mapProposalToGuildApplication);
  },

  // Get guild application details
  getDetails: async (applicationId: string, expertId?: string) => {
    const query = expertId ? `?expertId=${expertId}` : "";
    const data = await apiRequest<Record<string, unknown>>(`/api/proposals/${applicationId}${query}`);
    return mapProposalToGuildApplication(data);
  },

  // Vote on a guild application (supports both legacy vote and new score)
  vote: (
    applicationId: string,
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
    apiRequest<{ success: boolean }>(`/api/proposals/${applicationId}/vote`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // Close a guild application
  close: (applicationId: string, approved: boolean) =>
    apiRequest<{ success: boolean }>(`/api/proposals/${applicationId}/close`, {
      method: "POST",
      body: JSON.stringify({ approved }),
    }),

  // Get all votes for a guild application
  getVotes: async (applicationId: string) => {
    const data = await apiRequest<Record<string, unknown>[]>(`/api/proposals/${applicationId}/votes`);
    return data.map((v): import("@/types").VoteHistoryItem => ({
      id: v.id as string,
      expert_id: (v.expertId ?? v.expert_id) as string,
      expert_name: (v.expertName ?? v.expert_name) as string | undefined,
      score: Number(v.score ?? 0),
      alignment_distance: v.alignmentDistance != null || v.alignment_distance != null
        ? Number(v.alignmentDistance ?? v.alignment_distance) : undefined,
      reputation_change: v.reputationChange != null || v.reputation_change != null
        ? Number(v.reputationChange ?? v.reputation_change) : undefined,
      reward_amount: v.rewardAmount != null || v.reward_amount != null
        ? Number(v.rewardAmount ?? v.reward_amount) : undefined,
      comment: (v.comment) as string | undefined,
      created_at: (v.createdAt ?? v.created_at ?? "") as string,
    }));
  },

  // Get expert's vote on a guild application
  getExpertVote: (applicationId: string, expertId: string) =>
    apiRequest<import("@/types").VoteHistoryItem | null>(`/api/proposals/${applicationId}/vote/${expertId}`),

  // Get guild applications assigned to a specific expert
  getAssigned: async (expertId: string, guildId?: string) => {
    const query = guildId ? `?guildId=${guildId}` : "";
    const data = await apiRequest<Record<string, unknown>[]>(`/api/proposals/assigned/${expertId}${query}`);
    return data.map(mapProposalToGuildApplication);
  },

  // Check if expert is eligible to vote on a guild application
  checkEligibility: (applicationId: string, expertId: string) =>
    apiRequest<import("@/types").VoteEligibility>(`/api/proposals/${applicationId}/eligibility/${expertId}`),
};

// Utility function to get asset URL
export const getAssetUrl = (path: string) => {
  if (!path) return "";
  return path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
};

// Governance API
export const governanceApi = {
  createProposal: (data: Record<string, unknown>, wallet: string) =>
    apiRequest<{ id: string }>(`/api/governance/proposals?wallet=${encodeURIComponent(wallet)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  getProposals: (params?: {
    status?: string;
    type?: string;
    guildId?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.type) queryParams.append("type", params.type);
    if (params?.guildId) queryParams.append("guildId", params.guildId);
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());
    const query = queryParams.toString();
    return apiRequest<import("@/types").GovernanceProposalDetail[]>(`/api/governance/proposals${query ? `?${query}` : ""}`);
  },

  getActiveProposals: () =>
    apiRequest<import("@/types").GovernanceProposalDetail[]>("/api/governance/proposals/active"),

  getProposal: (id: string) =>
    apiRequest<import("@/types").GovernanceProposalDetail>(`/api/governance/proposals/${id}`),

  vote: (id: string, data: { vote: "for" | "against" | "abstain"; votingPower?: number; reason?: string }, wallet: string) =>
    apiRequest<{ success: boolean }>(`/api/governance/proposals/${id}/vote?wallet=${encodeURIComponent(wallet)}`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  finalize: (id: string) =>
    apiRequest<{ success: boolean }>(`/api/governance/proposals/${id}/finalize`, {
      method: "POST",
    }),

  getGuildMaster: (guildId: string) =>
    apiRequest<import("@/types").GuildMaster>(`/api/governance/guilds/${encodeURIComponent(guildId)}/master`),
};

// Endorsement Accountability API
export const endorsementAccountabilityApi = {
  recordHireOutcome: (data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>("/api/endorsements/hire-outcome", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  reportPerformanceIssue: (data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>("/api/endorsements/performance-issue", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  getHireOutcome: (applicationId: string) =>
    apiRequest<import("@/types").DisputeDetail>(`/api/endorsements/hire-outcome/${applicationId}`),

  getExpertRewards: (expertId: string) =>
    apiRequest<Record<string, unknown>>(`/api/endorsements/rewards/${expertId}`),

  fileDispute: (data: Record<string, unknown>) =>
    apiRequest<{ id: string }>("/api/endorsements/disputes", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  submitArbitrationVote: (disputeId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/endorsements/disputes/${disputeId}/vote`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),
};

// Messaging API
export const messagingApi = {
  startConversation: (data: {
    applicationId: string;
    message: string;
  }) =>
    apiRequest<import("@/types").Conversation>("/api/messaging/conversations", {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  getCompanyConversations: (params?: {
    jobId?: string;
    status?: string;
    unreadOnly?: boolean;
    search?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.jobId) queryParams.append("jobId", params.jobId);
    if (params?.status) queryParams.append("status", params.status);
    if (params?.unreadOnly) queryParams.append("unreadOnly", "true");
    if (params?.search) queryParams.append("search", params.search);
    const query = queryParams.toString();
    return apiRequest<import("@/types").Conversation[] | { conversations: import("@/types").Conversation[] }>(`/api/messaging/conversations/company${query ? `?${query}` : ""}`, {
      requiresAuth: true,
    });
  },

  getCandidateConversations: () =>
    apiRequest<import("@/types").Conversation[] | { conversations: import("@/types").Conversation[] }>("/api/messaging/conversations/candidate", {
      requiresAuth: true,
    }),

  getConversation: (conversationId: string) =>
    apiRequest<{ conversation?: import("@/types").Conversation; messages: import("@/types").Message[] } & import("@/types").Conversation>(`/api/messaging/conversations/${conversationId}`, {
      requiresAuth: true,
    }),

  getConversationByApplication: (applicationId: string) =>
    apiRequest<import("@/types").Conversation | null>(`/api/messaging/conversations/application/${applicationId}`, {
      requiresAuth: true,
    }),

  sendMessage: (conversationId: string, content: string) =>
    apiRequest<import("@/types").Message>(`/api/messaging/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content }),
      requiresAuth: true,
    }),

  markAsRead: (conversationId: string) =>
    apiRequest<{ success: boolean }>(`/api/messaging/conversations/${conversationId}/read`, {
      method: "POST",
      requiresAuth: true,
    }),

  getUnreadCounts: () =>
    apiRequest<import("@/types").UnreadCounts>("/api/messaging/unread-counts", {
      requiresAuth: true,
    }),

  scheduleMeeting: (
    conversationId: string,
    data: {
      title: string;
      scheduledAt: string;
      duration: number;
      provider: "google_meet" | "calendly" | "custom";
      meetingUrl: string;
    }
  ) =>
    apiRequest<import("@/types").Message>(`/api/messaging/conversations/${conversationId}/meeting`, {
      method: "POST",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  archiveConversation: (conversationId: string) =>
    apiRequest<{ success: boolean }>(`/api/messaging/conversations/${conversationId}/archive`, {
      method: "POST",
      requiresAuth: true,
    }),

  respondToMeeting: (
    conversationId: string,
    meetingId: string,
    data: {
      status: "accepted" | "declined" | "new_time_proposed";
      proposedTime?: string;
      proposedNote?: string;
    }
  ) =>
    apiRequest<import("@/types").Message>(
      `/api/messaging/conversations/${conversationId}/meeting/${meetingId}/respond`,
      {
        method: "POST",
        body: JSON.stringify(data),
        requiresAuth: true,
      }
    ),

  companyRespondToMeeting: (
    conversationId: string,
    meetingId: string,
    data: { status: "accepted" | "declined" }
  ) =>
    apiRequest<import("@/types").Message>(
      `/api/messaging/conversations/${conversationId}/meeting/${meetingId}/company-respond`,
      {
        method: "POST",
        body: JSON.stringify(data),
        requiresAuth: true,
      }
    ),

  getUpcomingMeetings: (params?: { limit?: number }) => {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", String(params.limit));
    const query = queryParams.toString();
    return apiRequest<import("@/types").UpcomingMeeting[] | { meetings: import("@/types").UpcomingMeeting[] }>(
      `/api/messaging/meetings/upcoming${query ? `?${query}` : ""}`,
      { requiresAuth: true }
    );
  },
};

// Commit-Reveal Voting API
export const commitRevealApi = {
  enableCommitReveal: (applicationId: string, data?: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/proposals/${applicationId}/commit-reveal/enable`, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    }),

  getPhaseStatus: (applicationId: string) =>
    apiRequest<import("@/types").CommitRevealPhaseStatus>(`/api/proposals/${applicationId}/commit-reveal/status`),

  submitCommitment: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/proposals/${applicationId}/commit`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  revealVote: (applicationId: string, data: Record<string, unknown>) =>
    apiRequest<{ success: boolean }>(`/api/proposals/${applicationId}/reveal`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  generateHash: (score: number, nonce: string) =>
    apiRequest<import("@/types").CommitRevealHash>("/api/proposals/commit-reveal/generate-hash", {
      method: "POST",
      body: JSON.stringify({ score, nonce }),
    }),
};

// Guild Application Appeal API (Stage 2b: Decentralized Arbitration)
export const guildAppealApi = {
  /** File an appeal for a rejected guild application */
  fileAppeal: (data: {
    applicationId: string;
    applicationType: "expert" | "candidate" | "proposal";
    wallet: string;
    appealReason: string;
    evidence?: string;
    stakeAmount: number;
    txHash?: string;
  }) =>
    apiRequest<{ id: string }>(
      `/api/guilds/appeals`,
      {
        method: "POST",
        headers: { "X-Wallet-Address": data.wallet },
        body: JSON.stringify({
          applicationId: data.applicationId,
          applicationType: data.applicationType,
          appealReason: data.appealReason,
          evidence: data.evidence,
          stakeAmount: data.stakeAmount,
          txHash: data.txHash,
        }),
      }
    ),

  /** Get the most recent appeal for a specific application */
  getAppealByApplication: async (applicationId: string) => {
    const { mapAppealResponse } = await import("@/types");
    const raw = await apiRequest<unknown>(
      `/api/guilds/appeals/by-application/${applicationId}`
    );
    return raw ? mapAppealResponse(raw) : null;
  },

  /** Get appeal details by appeal ID */
  getAppeal: async (appealId: string) => {
    const { mapAppealResponse } = await import("@/types");
    const raw = await apiRequest<unknown>(`/api/guilds/appeals/${appealId}`);
    return mapAppealResponse(raw);
  },

  /** Get all appeals for a guild (for Officers/Masters) */
  getGuildAppeals: async (guildId: string, status?: string) => {
    const { mapAppealResponse } = await import("@/types");
    const query = status ? `?status=${status}` : "";
    const raw = await apiRequest<unknown[]>(
      `/api/guilds/${guildId}/appeals${query}`
    );
    return raw.map(mapAppealResponse);
  },

  /** Vote on an appeal (Officers/Masters only) */
  voteOnAppeal: (
    appealId: string,
    data: {
      wallet: string;
      decision: "uphold" | "overturn";
      reasoning: string;
    }
  ) => {
    const backendVote =
      data.decision === "uphold" ? "uphold_rejection" : "approve_appeal";
    return apiRequest<{ success: boolean }>(
      `/api/guilds/appeals/${appealId}/vote`,
      {
        method: "POST",
        headers: { "X-Wallet-Address": data.wallet },
        body: JSON.stringify({
          vote: backendVote,
          reasoning: data.reasoning,
        }),
      }
    );
  },

  /** Check if expert is eligible to file an appeal */
  checkAppealEligibility: (applicationId: string, wallet: string) =>
    apiRequest<{ eligible: boolean; reason?: string; minimumStake: number }>(
      `/api/guilds/appeals/by-application/${applicationId}/eligibility`,
      { headers: { "X-Wallet-Address": wallet } }
    ),
};
