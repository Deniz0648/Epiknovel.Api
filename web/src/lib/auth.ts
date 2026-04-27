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

export type AnnouncementItem = {
  id: string;
  title: string;
  content: string;
  imageUrl?: string | null;
  isPinned: boolean;
  createdAt: string;
};

export type BookCategoryItem = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  displayOrder: number;
};

export type BookTagItem = {
  id: string;
  name: string;
  slug: string;
};

export type MyBookListItem = {
  id: string;
  title: string;
  slug: string;
  description: string;
  coverImageUrl?: string | null;
  status: "Draft" | "Ongoing" | "Completed" | "Hiatus" | "Cancelled" | number;
  contentRating: "General" | "Teen" | "Mature" | number;
  chapterCount: number;
  viewCount: number;
  averageRating: number;
  voteCount: number;
  originalAuthorName: string | null;
  type: "Original" | "Translation" | number;
  isHidden: boolean;
  isDeleted: boolean;
  authorId: string;
  categories: BookCategoryItem[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
};

export type MyBookListResponse = {
  items: MyBookListItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

export type MyChapterListItem = {
  id: string;
  title: string;
  slug: string;
  order: number;
  wordCount: number;
  status: "Draft" | "Published" | "Scheduled";
  price: number;
  isFree: boolean;
  viewCount: number;
  createdAt: string;
  publishedAt?: string;
  scheduledPublishDate?: string;
  authorName?: string;
};

export type MyChapterPagedResponse = {
  items: MyChapterListItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
};

export type FollowResult = {
  followersCount: number;
  message: string;
};

export type MediaUploadResult = {
  url: string;
  fileName: string;
};

export type AddressDto = {
  fullName: string;
  country: string;
  city: string;
  district: string;
  addressLine: string;
  zipCode: string;
  phoneNumber: string;
  taxNumber?: string | null;
  taxOffice?: string | null;
  identityNumber?: string | null;
};

export type MyProfile = {
  userId: string;
  displayName: string;
  slug?: string;
  bio?: string | null;
  avatarUrl?: string | null;
  followersCount: number;
  followingCount: number;
  emailConfirmed: boolean;
  isAuthor?: boolean;
  tokenBalance: number;
  permissions?: {
    accessAuthorPanel: boolean;
    createBook: boolean;
    publishPaidChapters: boolean;
    manageOwnBooks: boolean;
    manageOwnChapters: boolean;
    moderateContent: boolean;
    adminAccess: boolean;
    superAdminAccess: boolean;
  };
  billingAddress?: AddressDto | null;
};

type PermissionFlags = Partial<NonNullable<MyProfile["permissions"]>>;

export function canAccessAuthorPanel(profile?: { isAuthor?: boolean; permissions?: PermissionFlags } | null) {
  return !!(
    profile?.permissions?.adminAccess || 
    profile?.permissions?.superAdminAccess || 
    profile?.permissions?.moderateContent ||
    (profile?.permissions?.accessAuthorPanel ?? profile?.isAuthor)
  );
}

export function canAccessAdminPanel(profile?: { permissions?: PermissionFlags } | null) {
  return !!(
    profile?.permissions?.adminAccess ||
    profile?.permissions?.superAdminAccess ||
    profile?.permissions?.moderateContent
  );
}

export function canCreateBook(profile?: { permissions?: PermissionFlags } | null) {
  return !!(
    profile?.permissions?.adminAccess || 
    profile?.permissions?.superAdminAccess || 
    profile?.permissions?.moderateContent ||
    profile?.permissions?.createBook
  );
}

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

export async function updateMyBillingAddress(request: AddressDto) {
  return apiRequest<IdentityMessage>("/users/me/billing-address", {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify(request),
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

export async function getAnnouncements() {
  return apiRequest<{ items: AnnouncementItem[] }>("/announcements", {
    method: "GET",
    credentials: "include",
  });
}

export async function getBookCategories() {
  return apiRequest<{ categories: BookCategoryItem[] }>("/books/categories", {
    method: "GET",
    credentials: "include",
  });
}

export async function getBookTags() {
  return apiRequest<{ tags: BookTagItem[] }>("/books/tags", {
    method: "GET",
    credentials: "include",
  });
}

export async function createBook(request: {
  title: string;
  description: string;
  coverImageUrl?: string | null;
  status: number;
  contentRating: number;
  type: number;
  originalAuthorName?: string | null;
  categoryIds: string[];
  tags: string[];
}) {
  return apiRequest<{ id: string; slug: string; message: string }>("/books", {
    method: "POST",
    credentials: "include",
    body: JSON.stringify(request),
  });
}

export async function getMyBooks(request?: {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  status?: string;
  type?: string | number;
  OnlyDeleted?: boolean;
  sortBy?: string;
  sortDescending?: boolean;
}) {
  const searchParams = new URLSearchParams({
    pageNumber: String(request?.pageNumber ?? 1),
    pageSize: String(request?.pageSize ?? 12),
    sortBy: request?.sortBy ?? "UpdatedAt",
    sortDescending: String(request?.sortDescending ?? true),
  });

  if (request?.search?.trim()) {
    searchParams.set("search", request.search.trim());
  }
  if (request?.status?.trim()) {
    searchParams.set("status", request.status.trim());
  }
  if (request?.OnlyDeleted !== undefined) {
    searchParams.set("onlyDeleted", String(request.OnlyDeleted));
  }
  if (request?.type !== undefined && request.type !== "") {
    searchParams.set("type", String(request.type));
  }

  return apiRequest<MyBookListResponse>(`/books/mine?${searchParams.toString()}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function getMyBookBySlug(slug: string) {
  return apiRequest<MyBookListItem>(`/books/mine/${slug}`, {
    method: "GET",
    credentials: "include",
  });
}

export async function restoreBook(id: string) {
  return apiRequest<{ message: string }>(`/books/${id}/restore`, {
    method: "POST",
    credentials: "include",
  });
}

export async function restoreChapter(id: string) {
  return apiRequest<{ message: string }>(`/books/chapters/${id}/restore`, {
    method: "POST",
    credentials: "include",
  });
}

export async function updateBook(
  id: string,
  data: {
    title: string;
    description: string;
    coverImageUrl?: string | null;
    status: number;
    contentRating: number;
    categoryIds: string[];
    tags: string[];
    type?: number;
    originalAuthorName?: string | null;
  },
) {
  return apiRequest<{ message: string; slug: string }>(`/books/${id}`, {
    method: "PUT",
    credentials: "include",
    body: JSON.stringify(data),
  });
}

export async function deleteBook(id: string) {
  return apiRequest<{ message: string }>(`/books/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
}



export async function getMyChapters(
  bookSlug: string,
  request?: { pageNumber?: number; pageSize?: number; search?: string; status?: string; OnlyDeleted?: boolean },
) {
  const searchParams = new URLSearchParams();

  if (request?.pageNumber) {
    searchParams.set("pageNumber", String(request.pageNumber));
  }
  if (request?.pageSize) {
    searchParams.set("pageSize", String(request.pageSize));
  }
  if (request?.search?.trim()) {
    searchParams.set("search", request.search.trim());
  }
  if (request?.status?.trim()) {
    searchParams.set("status", request.status.trim());
  }
  if (request?.OnlyDeleted !== undefined) {
    searchParams.set("onlyDeleted", String(request.OnlyDeleted));
  }

  return apiRequest<MyChapterPagedResponse>(`/books/mine/${bookSlug}/chapters?${searchParams.toString()}`, {
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
