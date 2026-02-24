// auth.ts - Centralized authentication utilities

/**
 * Clear all authentication data from localStorage and wallet connections
 * This ensures only one account type can be logged in at a time
 */
/**
 * Clear only token-based auth (candidate/company) — preserves wallet and expert state.
 * Use this when entering the login/signup pages so expert wallet sessions survive.
 */
export function clearTokenAuthState() {
  localStorage.removeItem("authToken");
  localStorage.removeItem("companyAuthToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("candidateId");
  localStorage.removeItem("companyId");
  localStorage.removeItem("candidateEmail");
  localStorage.removeItem("companyEmail");
  localStorage.removeItem("candidateWallet");
  localStorage.removeItem("companyWallet");
}

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

