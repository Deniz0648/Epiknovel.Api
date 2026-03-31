import { ApiError, apiRequest } from "@/lib/api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  displayName: string;
};

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  token: string;
  newPassword: string;
};

export type ConfirmEmailRequest = {
  userId: string;
  token: string;
};

export type ConfirmChangeEmailRequest = {
  newEmail: string;
  token: string;
};

export type ChangePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type ChangeEmailRequest = {
  newEmail: string;
};

export type AssignRoleRequest = {
  userId: string;
  roleName: string;
};

export type IdentityMessage = {
  message: string;
};

export type UserSession = {
  sessionId: string;
  device: string;
  ipAddress: string;
  createdAt: string;
  isCurrent: boolean;
};

export type PublicUserProfile = {
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  isAuthor?: boolean;
  isRedirected?: boolean;
};

export type PublicUserListItem = {
  slug: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  isAuthor: boolean;
  booksCount: number;
  followersCount: number;
  followingCount: number;
  isFollowing: boolean;
  joinedAt: string;
};

export type PublicUserListResponse = {
  items: PublicUserListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type PublicBookListItem = {
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  authorName?: string | null;
  authorSlug?: string | null;
};

export type PublicBookListResponse = {
  items: PublicBookListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
};

export type FollowResult = {
  followersCount: number;
  message: string;
};

export type MediaUploadResult = {
  url: string;
  fileName: string;
};

export type MyProfile = {
  userId: string;
  displayName: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  emailConfirmed: boolean;
};

let sessionPromise: Promise<MyProfile | null> | null = null;

export async function login(request: LoginRequest): Promise<MyProfile> {
  return apiRequest<MyProfile>("/auth/login", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function register(request: RegisterRequest) {
  return apiRequest<{ message: string }>("/auth/register", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function logout() {
  return apiRequest<{ message: string }>("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
}

export async function refreshToken() {
  return apiRequest<{ accessToken: string; refreshToken: string; expiryDate: string }>("/auth/refresh-token", {
    method: "POST",
    credentials: "include",
  });
}

export async function forgotPassword(request: ForgotPasswordRequest) {
  return apiRequest<IdentityMessage>("/auth/forgot-password", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function resetPassword(request: ResetPasswordRequest) {
  return apiRequest<IdentityMessage>("/auth/reset-password", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function confirmEmail(request: ConfirmEmailRequest) {
  return apiRequest<{ message: string; profile: MyProfile | null }>("/auth/confirm-email", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function confirmChangeEmail(request: ConfirmChangeEmailRequest) {
  return apiRequest<IdentityMessage>("/auth/confirm-change-email", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function resendConfirmEmail() {
  return apiRequest<IdentityMessage>("/auth/confirm-email/resend", {
    method: "POST",
    credentials: "include",
  });
}

export async function changePassword(request: ChangePasswordRequest) {
  return apiRequest<IdentityMessage>("/auth/change-password", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function changeEmail(request: ChangeEmailRequest) {
  return apiRequest<IdentityMessage>("/auth/change-email", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function assignRole(request: AssignRoleRequest) {
  return apiRequest<IdentityMessage>("/auth/roles/assign", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function getSessions() {
  return apiRequest<UserSession[]>("/auth/sessions", {
    method: "GET",
    credentials: "include",
  });
}

export async function revokeSession(sessionId: string) {
  return apiRequest<IdentityMessage>(`/auth/sessions/${sessionId}`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function revokeAllSessions() {
  return apiRequest<IdentityMessage>("/auth/sessions/all", {
    method: "DELETE",
    credentials: "include",
  });
}

export async function getMyUserProfile() {
  return apiRequest<MyProfile>("/users/me", {
    method: "GET",
    credentials: "include",
  });
}

export async function updateMyUserProfile(request: { displayName: string; slug?: string; bio?: string | null }) {
  return apiRequest<IdentityMessage>("/users/me", {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function updateMyAvatar(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  return apiRequest<{ avatarUrl: string; message: string }>("/users/me/avatar", {
    method: "PUT",
    credentials: "include",
    body: formData,
  });
}

export async function followUser(followingId: string) {
  return apiRequest<FollowResult>(`/users/${followingId}/follow`, {
    method: "POST",
    credentials: "include",
  });
}

export async function unfollowUser(followingId: string) {
  return apiRequest<FollowResult>(`/users/${followingId}/follow`, {
    method: "DELETE",
    credentials: "include",
  });
}

export async function getPublicUserProfile(slug: string) {
  return apiRequest<PublicUserProfile>(`/users/${slug}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function getPublicUserProfiles(request?: {
  pageNumber?: number;
  pageSize?: number;
  query?: string;
  isAuthor?: boolean;
  sortBy?: "joinedAt" | "displayName" | "followers";
  sortDirection?: "asc" | "desc";
}) {
  const searchParams = new URLSearchParams({
    pageNumber: String(request?.pageNumber ?? 1),
    pageSize: String(request?.pageSize ?? 12),
  });

  if (request?.query?.trim()) {
    searchParams.set("query", request.query.trim());
  }
  if (typeof request?.isAuthor === "boolean") {
    searchParams.set("isAuthor", String(request.isAuthor));
  }
  if (request?.sortBy) {
    searchParams.set("sortBy", request.sortBy);
  }
  if (request?.sortDirection) {
    searchParams.set("sortDirection", request.sortDirection);
  }

  return apiRequest<PublicUserListResponse>(`/users?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function getPublicBooks(request?: {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  authorSlug?: string;
  sortBy?: string;
  sortDescending?: boolean;
}) {
  const searchParams = new URLSearchParams({
    pageNumber: String(request?.pageNumber ?? 1),
    pageSize: String(request?.pageSize ?? 50),
    sortBy: request?.sortBy ?? "CreatedAt",
    sortDescending: String(request?.sortDescending ?? true),
  });

  if (request?.search?.trim()) {
    searchParams.set("search", request.search.trim());
  }
  if (request?.authorSlug?.trim()) {
    searchParams.set("authorSlug", request.authorSlug.trim());
  }

  return apiRequest<PublicBookListResponse>(`/books?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function uploadMedia(file: File, options?: { category?: string; width?: number; height?: number }) {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("category", options?.category ?? "general");

  if (typeof options?.width === "number") {
    formData.set("width", String(options.width));
  }

  if (typeof options?.height === "number") {
    formData.set("height", String(options.height));
  }

  return apiRequest<MediaUploadResult>("/media/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
}

export async function getSessionProfile(): Promise<MyProfile | null> {
  try {
    return await apiRequest<MyProfile>("/auth/session", {
      method: "GET",
      credentials: "include",
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }

    throw error;
  }
}

export async function getValidSession(): Promise<MyProfile | null> {
  if (!sessionPromise) {
    sessionPromise = getSessionProfile().finally(() => {
      sessionPromise = null;
    });
  }

  return sessionPromise;
}
