const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
  const { requiresAuth = false, headers = {}, ...fetchOptions } = options;

  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (requiresAuth) {
    const token = localStorage.getItem("authToken");
    if (token) {
      requestHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
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
  getAll: (params?: { status?: string; search?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append("status", params.status);
    if (params?.search) queryParams.append("search", params.search);
    const query = queryParams.toString();
    return apiRequest(`/api/jobs${query ? `?${query}` : ""}`, {
      requiresAuth: true,
    });
  },

  getById: (id: string) =>
    apiRequest(`/api/jobs/${id}`, {
      requiresAuth: true,
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
  getStats: () =>
    apiRequest("/api/dashboard/stats", {
      requiresAuth: true,
    }),
};

// Company API
export const companyApi = {
  create: (data: Record<string, unknown>) =>
    apiRequest("/api/companies", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Applications API
export const applicationsApi = {
  getAll: () =>
    apiRequest("/api/candidates/me/applications", {
      requiresAuth: true,
    }),

  updateStatus: (id: string, status: string, notes?: string) =>
    apiRequest(`/api/applications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
      requiresAuth: true,
    }),
};

// Profile API
export const profileApi = {
  get: () =>
    apiRequest("/api/profile", {
      requiresAuth: true,
    }),

  update: (data: Record<string, unknown>) =>
    apiRequest("/api/profile", {
      method: "PUT",
      body: JSON.stringify(data),
      requiresAuth: true,
    }),

  uploadResume: (file: File) => {
    const formData = new FormData();
    formData.append("resume", file);
    return fetch(`${API_BASE_URL}/api/profile/resume`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("authToken")}`,
      },
      body: formData,
    }).then((res) => {
      if (!res.ok) throw new ApiError(res.status, res.statusText);
      return res.json();
    });
  },
};
