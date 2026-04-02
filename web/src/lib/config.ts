export function getApiUrl(): string {
  // Client side: process.env.NEXT_PUBLIC_API_BASE_URL (if provided) or absolute /api
  // This matches the api.ts logic but ensures EditChapterForm from markdown works.
  return process.env.NEXT_PUBLIC_API_BASE_URL || "/api";
}
