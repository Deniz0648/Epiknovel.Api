"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getMyUserProfile,
  getValidSession,
  login,
  logout,
  register,
  type LoginRequest,
  type MyProfile,
  type RegisterRequest,
} from "@/lib/auth";

type AuthContextValue = {
  profile: MyProfile | null;
  isLoading: boolean;
  loginWithPassword: (request: LoginRequest) => Promise<MyProfile>;
  registerWithPassword: (request: RegisterRequest) => Promise<string>;
  logout: () => Promise<void>;
  refreshProfile: (transform?: (profile: MyProfile) => MyProfile) => Promise<MyProfile | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        const session = await getValidSession();
        if (cancelled || !session) {
          return;
        }

        setProfile(session);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loginWithPassword(request: LoginRequest) {
    const nextProfile = await login(request);
    setProfile(nextProfile);
    return nextProfile;
  }

  async function registerWithPassword(request: RegisterRequest) {
    const response = await register(request);
    return response.message;
  }

  async function refreshProfile(transform?: (profile: MyProfile) => MyProfile) {
    try {
      const nextProfile = await getMyUserProfile();
      const resolvedProfile = transform ? transform(nextProfile) : nextProfile;
      setProfile(resolvedProfile);
      return resolvedProfile;
    } catch {
      return null;
    }
  }

  async function logoutFromSession() {
    try {
      await logout();
    } finally {
      setProfile(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        profile,
        isLoading,
        loginWithPassword,
        registerWithPassword,
        logout: logoutFromSession,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}
