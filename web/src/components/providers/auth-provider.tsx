"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  getMyUserProfile,
  getValidSession,
  login,
  logout,
  refreshToken,
  register,
  type LoginRequest,
  type MyProfile,
  type RegisterRequest,
} from "@/lib/auth";
import { dispatchHubInvocation } from "@/lib/hub-events";
import { connectHub, type HubInvocation } from "@/lib/signalr-client";

const AUTH_REFRESH_LOCK_KEY = "epiknovel.auth.refresh.lock";
const AUTH_REFRESH_LOCK_TTL_MS = 10_000;
const AUTH_REFRESH_LOCK_POLL_MS = 150;
const AUTH_REFRESH_LOCK_WAIT_MS = 10_000;

type AuthRefreshLock = {
  ownerId: string;
  expiresAt: number;
};

function createTabId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readRefreshLock(): AuthRefreshLock | null {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(AUTH_REFRESH_LOCK_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(rawValue) as AuthRefreshLock;
    if (!parsedValue.ownerId || typeof parsedValue.expiresAt !== "number") {
      return null;
    }

    if (parsedValue.expiresAt <= Date.now()) {
      window.localStorage.removeItem(AUTH_REFRESH_LOCK_KEY);
      return null;
    }

    return parsedValue;
  } catch {
    window.localStorage.removeItem(AUTH_REFRESH_LOCK_KEY);
    return null;
  }
}

function acquireRefreshLock(ownerId: string) {
  if (typeof window === "undefined") {
    return false;
  }

  const currentLock = readRefreshLock();
  if (currentLock && currentLock.ownerId !== ownerId) {
    return false;
  }

  const nextLock: AuthRefreshLock = {
    ownerId,
    expiresAt: Date.now() + AUTH_REFRESH_LOCK_TTL_MS,
  };

  window.localStorage.setItem(AUTH_REFRESH_LOCK_KEY, JSON.stringify(nextLock));
  return readRefreshLock()?.ownerId === ownerId;
}

function releaseRefreshLock(ownerId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const currentLock = readRefreshLock();
  if (currentLock?.ownerId === ownerId) {
    window.localStorage.removeItem(AUTH_REFRESH_LOCK_KEY);
  }
}

async function waitForRefreshLockRelease(timeoutMs: number) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!readRefreshLock()) {
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, AUTH_REFRESH_LOCK_POLL_MS));
  }
}

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
  const tabIdRef = useRef(createTabId());
  const authSyncRef = useRef<Promise<boolean> | null>(null);

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

  async function synchronizeAuthState() {
    if (authSyncRef.current) {
      return authSyncRef.current;
    }

    const tabId = tabIdRef.current;
    const syncPromise = (async () => {
      if (acquireRefreshLock(tabId)) {
        try {
          await refreshToken();
          const nextProfile = await getMyUserProfile();
          setProfile(nextProfile);
          return true;
        } catch {
          try {
            const nextProfile = await getValidSession();
            setProfile(nextProfile);
            return nextProfile !== null;
          } catch {
            setProfile(null);
            return false;
          }
        } finally {
          releaseRefreshLock(tabId);
        }
      }

      await waitForRefreshLockRelease(AUTH_REFRESH_LOCK_WAIT_MS);

      try {
        const nextProfile = await getValidSession();
        setProfile(nextProfile);
        return nextProfile !== null;
      } catch {
        setProfile(null);
        return false;
      }
    })().finally(() => {
      authSyncRef.current = null;
    });

    authSyncRef.current = syncPromise;
    return syncPromise;
  }

  useEffect(() => {
    if (!profile) {
      return;
    }

    const handleInvocation = async (message: HubInvocation) => {
      dispatchHubInvocation(message);
      if (message.target === "AuthStateChanged" || message.target === "RoleUpdated") {
        await synchronizeAuthState();
      }
    };

    const hub = connectHub("/hubs/notifications", {
      onInvocation: handleInvocation,
      onUnauthorized: synchronizeAuthState,
    });

    return () => hub.dispose();
  }, [profile?.userId]);

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
