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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userType: null,
    userId: null,
    token: null,
  });

  useEffect(() => {
    // Load from localStorage on mount
    const token = localStorage.getItem('authToken') ||
                  localStorage.getItem('companyAuthToken');
    const userType = localStorage.getItem('userType');
    const candidateId = localStorage.getItem('candidateId');
    const companyId = localStorage.getItem('companyId');
    const expertId = localStorage.getItem('expertId');
    const walletAddress = localStorage.getItem('walletAddress');

    const userId = candidateId || companyId || expertId;

    if (token && userType && userId) {
      setAuthState({
        isAuthenticated: true,
        userType: userType as any,
        userId,
        token,
        walletAddress: walletAddress || undefined,
      });
    }
  }, []);

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

  const logout = () => {
    // Clear all auth-related localStorage items
    const keysToRemove = [
      'authToken',
      'companyAuthToken',
      'userType',
      'candidateId',
      'companyId',
      'expertId',
      'walletAddress',
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
