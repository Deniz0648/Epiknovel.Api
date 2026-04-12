import { apiRequest } from "./api";

export type CategoryDto = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
};

export type ManagementBookDto = {
  id: string;
  title: string;
  authorName: string;
  type: string;
  isHidden: boolean;
  viewCount: number;
  coverImageUrl?: string;
  createdAt: string;
};

export async function getCategories() {
  return apiRequest<{ categories: CategoryDto[] }>("/books/categories", {
    method: "GET"
  });
}

export async function getAdminBooks(searchTerm?: string) {
  const query = new URLSearchParams();
  if (searchTerm) query.set("search", searchTerm);
  
  return apiRequest<{ items: ManagementBookDto[] }>(`/management/compliance/books?${query.toString()}`, {
    method: "GET",
    credentials: "include"
  });
}

export function toBookSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/'/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function fromBookSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
