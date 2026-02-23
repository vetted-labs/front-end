'use client';

import { createContext, useState, useEffect, ReactNode } from 'react';

interface AuthState {
  isAuthenticated: boolean;
  userType: 'candidate' | 'company' | 'expert' | null;
  userId: string | null;
  token: string | null;
  walletAddress?: string;
}

interface AuthContextValue extends AuthState {
  login: (token: string, userType: string, userId: string, walletAddress?: string) => void;
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
    return { isAuthenticated: false, userType: null, userId: null, token: null };
  }
  try {
    const token = localStorage.getItem('authToken') ||
                  localStorage.getItem('companyAuthToken');
    const userType = localStorage.getItem('userType');
    const candidateId = localStorage.getItem('candidateId');
    const companyId = localStorage.getItem('companyId');
    const expertId = localStorage.getItem('expertId');
    const walletAddress = localStorage.getItem('walletAddress');
    const userId = candidateId || companyId || expertId;

    if (token && userType && userId) {
      return {
        isAuthenticated: true,
        userType: userType as AuthState['userType'],
        userId,
        token,
        walletAddress: walletAddress || undefined,
      };
    }
  } catch {
    // localStorage may throw in some environments
  }
  return { isAuthenticated: false, userType: null, userId: null, token: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(getInitialAuthState);

  const login = (token: string, userType: string, userId: string, walletAddress?: string) => {
    // Store in localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('userType', userType);
    localStorage.setItem(`${userType}Id`, userId);

    if (walletAddress) {
      localStorage.setItem('walletAddress', walletAddress);
    }

    // Update state
    setAuthState({
      isAuthenticated: true,
      userType: userType as any,
      userId,
      token,
      walletAddress,
    });
  };

  const logout = async () => {
    // 🔐 SECURITY: Revoke backend refresh token before clearing local state
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        await fetch(`${apiUrl}/api/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } catch {
      // Best-effort: clear local state even if backend call fails
    }

    // Clear all auth-related localStorage items
    const keysToRemove = [
      'authToken',
      'companyAuthToken',
      'refreshToken',
      'userType',
      'candidateId',
      'companyId',
      'expertId',
      'walletAddress',
      'candidateEmail',
      'companyEmail',
      'candidateWallet',
      'companyWallet',
    ];

    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Reset state
    setAuthState({
      isAuthenticated: false,
      userType: null,
      userId: null,
      token: null,
    });
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
