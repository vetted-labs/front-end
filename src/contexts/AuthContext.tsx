'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';
import { clearAllAuthState } from '@/lib/auth';

interface AuthState {
  isAuthenticated: boolean;
  userType: 'candidate' | 'company' | 'expert' | null;
  userId: string | null;
  email: string | null;
  token: string | null;
  walletAddress?: string;
}

interface AuthContextValue extends AuthState {
  login: (token: string, userType: string, userId: string, email?: string, walletAddress?: string) => void;
  logout: () => void;
  updateWallet: (address: string) => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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

  const login = (token: string, userType: string, userId: string, email?: string, walletAddress?: string) => {
    // Store in localStorage — experts may not have a token
    if (token) {
      localStorage.setItem('authToken', token);
    }
    localStorage.setItem('userType', userType);
    localStorage.setItem(`${userType}Id`, userId);

    if (email) {
      localStorage.setItem(`${userType}Email`, email);
    }
    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
    }

    // Update state
    setAuthState({
      isAuthenticated: true,
      userType: userType as AuthState['userType'],
      userId,
      email: email || null,
      token,
      walletAddress,
    });
  };

  const logout = () => {
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

    // Best-effort: revoke refresh token on backend (fire-and-forget)
    if (refreshToken) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      fetch(`${apiUrl}/api/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      }).catch(() => {});
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
