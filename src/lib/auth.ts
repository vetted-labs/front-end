// auth.ts - Centralized authentication utilities

/**
 * Clear all authentication data from localStorage and wallet connections
 * This ensures only one account type can be logged in at a time
 */
export function clearAllAuthState() {
  // Clear all localStorage auth tokens
  localStorage.removeItem("authToken");
  localStorage.removeItem("companyAuthToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("candidateId");
  localStorage.removeItem("companyId");
  localStorage.removeItem("expertId");
  localStorage.removeItem("candidateEmail");
  localStorage.removeItem("companyEmail");
  localStorage.removeItem("candidateWallet");
  localStorage.removeItem("companyWallet");
  localStorage.removeItem("walletAddress");
  localStorage.removeItem("userType");
}

/**
 * Check if user is authenticated as any type
 */
export function isAuthenticated(): {
  isAuth: boolean;
  type: "candidate" | "company" | "expert" | null;
  address?: string;
} {
  const candidateToken = localStorage.getItem("authToken");
  const companyToken = localStorage.getItem("companyAuthToken");
  const userType = localStorage.getItem("userType");

  if (candidateToken && userType === "candidate") {
    return { isAuth: true, type: "candidate" };
  }

  if (companyToken && userType === "company") {
    return { isAuth: true, type: "company" };
  }

  return { isAuth: false, type: null };
}
