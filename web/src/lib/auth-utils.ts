import { getAuthenticatedTokens, fetchProfileWithAccessToken } from "./server-auth";

export async function auth() {
  const tokens = await getAuthenticatedTokens();
  if (!tokens || !tokens.accessToken) {
    return null;
  }

  try {
    const profile = await fetchProfileWithAccessToken(tokens.accessToken);
    return {
      user: {
        id: profile.userId,
        name: profile.displayName,
        email: profile.userId // Fallback for email if not present
      },
      accessToken: tokens.accessToken
    };
  } catch (err) {
    return null;
  }
}
