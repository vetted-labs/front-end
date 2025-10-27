"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export function useAuth(requireAuth = true, userType?: "candidate" | "company") {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserType, setCurrentUserType] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUserType = localStorage.getItem("userType");

    if (requireAuth && !token) {
      router.push("/auth/login");
      return;
    }

    if (userType && storedUserType !== userType) {
      router.push("/auth/login");
      return;
    }

    setIsAuthenticated(!!token);
    setCurrentUserType(storedUserType);
    setIsLoading(false);
  }, [requireAuth, userType, router]);

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userType");
    router.push("/");
  };

  return {
    isAuthenticated,
    isLoading,
    userType: currentUserType,
    logout,
  };
}
