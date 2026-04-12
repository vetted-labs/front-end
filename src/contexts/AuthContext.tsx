'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { useAccount } from 'wagmi';
import { clearAllAuthState } from '@/lib/auth';
import { logger } from '@/lib/logger';

interface AuthState {
  isAuthenticated: boolean;
  userType: 'candidate' | 'company' | 'expert' | null;
  userId: string | null;
  email: string | null;
  token: string | null;
  walletAddress?: string;
}

interface AuthContextValue extends AuthState {
  login: (token: string, userType: string, userId: string, email?: string, walletAddress?: string, refreshToken?: string) => void;
  logout: () => void;
  updateWallet: (address: string) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Module-level flag marking that the user just explicitly logged out
 * (button click, not a MetaMask flicker). Lets route guards skip their
 * wallet-disconnect debounce and trust the navigation initiated by the
 * logout handler. Auto-clears after 1.5s.
 */
let recentExplicitLogout = false;
export function isRecentExplicitLogout() {
  return recentExplicitLogout;
}

/**
 * 🔐 SECURITY: Synchronous auth state initialization from localStorage
 * Prevents race condition where auth state is stale during initial render
 */
function getInitialAuthState(): AuthState {
  if (typeof window === "undefined") {
    return { isAuthenticated: false, userType: null, userId: null, email: null, token: null };
  }
  try {
    const token = localStorage.getItem('authToken') ||
                  localStorage.getItem('companyAuthToken');
    const userType = localStorage.getItem('userType');
    const candidateId = localStorage.getItem('candidateId');
    const companyId = localStorage.getItem('companyId');
    const expertId = localStorage.getItem('expertId');
    const walletAddress = localStorage.getItem('walletAddress');
    const email = localStorage.getItem('candidateEmail') ||
                  localStorage.getItem('companyEmail');
    const userId = candidateId || companyId || expertId;

    // Validate stored values — localStorage.setItem(key, undefined) stores the string "undefined"
    const validUserTypes = ['candidate', 'company', 'expert'];
    if (userType && !validUserTypes.includes(userType)) {
      return { isAuthenticated: false, userType: null, userId: null, email: null, token: null };
    }
    if (userId === 'undefined' || userId === 'null') {
      clearAllAuthState();
      return { isAuthenticated: false, userType: null, userId: null, email: null, token: null };
    }

    if (token && userType && userId) {
      return {
        isAuthenticated: true,
        userType: userType as AuthState['userType'],
        userId,
        email,
        token,
        walletAddress: walletAddress || undefined,
      };
    }

    // Expert wallet auth: experts authenticate via wallet, not token
    if (!token && userType === 'expert' && expertId && walletAddress) {
      return {
        isAuthenticated: true,
        userType: 'expert',
        userId: expertId,
        email: null,
        token: null,
        walletAddress,
      };
    }
  } catch {
    // localStorage may throw in some environments
  }
  return { isAuthenticated: false, userType: null, userId: null, email: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState);

  // Re-sync auth state from localStorage after hydration.
  // SSR renders with empty state (no localStorage); this ensures the first client
  // render picks up the stored session without waiting for an external event.
  // eslint-disable-next-line no-restricted-syntax -- hydration re-sync from localStorage
  useEffect(() => {
    setAuthState(getInitialAuthState());

    // Also re-sync when tokens are refreshed by the API layer
    const handler = () => setAuthState(getInitialAuthState());
    window.addEventListener('auth-token-refreshed', handler);
    return () => window.removeEventListener('auth-token-refreshed', handler);
  }, []);

  // When the wallet is disconnected (active disconnect OR failed reconnection),
  // clear expert auth so there's no ghost session
  const { status: walletStatus, address: wagmiAddress } = useAccount();

  // Sync connected wallet address to localStorage so apiRequest can send X-Wallet-Address.
  // Components should read wallet address from useAccount() directly — authState.walletAddress
  // is only kept as a fallback for non-wagmi consumers.
  // eslint-disable-next-line no-restricted-syntax -- reacts to wagmi wallet status changes
  useEffect(() => {
    if (walletStatus === 'connected' && wagmiAddress) {
      const stored = localStorage.getItem('walletAddress');
      if (stored !== wagmiAddress) {
        localStorage.setItem('walletAddress', wagmiAddress);
      }
    }
  }, [walletStatus, wagmiAddress]);

  // When the wallet is disconnected (active disconnect OR failed reconnection),
  // clear expert auth so there's no ghost session.
  // Debounce: MetaMask can briefly emit "disconnected" before reconnecting,
  // so wait before clearing auth — if wallet reconnects in time, cleanup cancels the timeout.
  // In E2E mode, wagmi is always "disconnected" — skip to preserve localStorage auth.
  // eslint-disable-next-line no-restricted-syntax -- reacts to wagmi wallet status changes
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_E2E_MODE === "true") return;
    if (walletStatus === 'reconnecting' || walletStatus === 'connecting') return;
    if (walletStatus !== 'disconnected' || authState.userType !== 'expert') return;

    const timer = setTimeout(() => {
      clearAllAuthState();
      setAuthState({ isAuthenticated: false, userType: null, userId: null, email: null, token: null, walletAddress: undefined });
    }, 2000);

    return () => clearTimeout(timer);
  }, [walletStatus, authState.userType]);

  const login = (token: string, userType: string, userId: string, email?: string, walletAddress?: string, refreshToken?: string) => {
    // Store in localStorage — experts may not have a token
    if (token) {
      localStorage.setItem('authToken', token);
    }
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }
    localStorage.setItem('userType', userType);
    localStorage.setItem(`${userType}Id`, userId);

    if (email) {
      localStorage.setItem(`${userType}Email`, email);
    }
    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
    } else if (userType !== 'expert') {
      localStorage.removeItem('walletAddress');
      localStorage.removeItem('expertId');
    }

    // Update state
    setAuthState({
      isAuthenticated: true,
      userType: userType as AuthState['userType'],
      userId,
      email: email || null,
      token,
      walletAddress: userType !== 'expert' && !walletAddress ? undefined : walletAddress,
    });
  };

  const logout = () => {
    // Mark this as an explicit logout so route guards skip their
    // wallet-disconnect debounce. Auto-clear after navigation settles.
    recentExplicitLogout = true;
    setTimeout(() => { recentExplicitLogout = false; }, 1500);

    // Grab refresh token before clearing localStorage
    const refreshToken = localStorage.getItem('refreshToken');

    // Clear all auth data from localStorage
    clearAllAuthState();

    // Reset React state immediately
    setAuthState({
      isAuthenticated: false,
      userType: null,
      userId: null,
      email: null,
      token: null,
      walletAddress: undefined,
    });

    // Best-effort: revoke refresh token on backend (fire-and-forget).
    // We can't use authApi.logout() here because clearAllAuthState() has
    // already wiped localStorage — authApi.logout reads the token from there.
    if (refreshToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch((err) => {
        logger.warn('Failed to revoke refresh token on logout:', err);
      });
    }
  };

  const updateWallet = (address: string) => {
    localStorage.setItem('walletAddress', address);
    setAuthState(prev => ({
      ...prev,
      walletAddress: address,
    }));
  };

  return (
    <AuthContext.Provider value={{
      ...authState,
      login,
      logout,
      updateWallet
    }}>
      {children}
    </AuthContext.Provider>
  );
}
