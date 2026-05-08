export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

function safeReturnTo(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

// Generate login URL at runtime so redirect URI reflects the current origin.
// Falls back to the in-app /login page when the external OAuth portal env
// vars are not configured (e.g. on Vercel). Without this fallback,
// `new URL("undefined/app-auth")` throws "Invalid URL" and crashes any
// page that calls useAuth().
export const getLoginUrl = (returnTo?: string) => {
  const oauthPortalUrl = import.meta.env.VITE_OAUTH_PORTAL_URL as
    | string
    | undefined;
  const appId = import.meta.env.VITE_APP_ID as string | undefined;
  const currentPath =
    typeof window !== "undefined"
      ? `${window.location.pathname}${window.location.search}`
      : "/";
  const targetPath = safeReturnTo(returnTo ?? currentPath);

  if (!oauthPortalUrl || !appId) {
    return `/login?returnTo=${encodeURIComponent(targetPath)}`;
  }

  try {
    const redirectUri = `${window.location.origin}/api/oauth/callback`;
    const state = btoa(redirectUri);

    const url = new URL(`${oauthPortalUrl}/app-auth`);
    url.searchParams.set("appId", appId);
    url.searchParams.set("redirectUri", redirectUri);
    url.searchParams.set("state", state);
    url.searchParams.set("type", "signIn");
    return url.toString();
  } catch {
    return `/login?returnTo=${encodeURIComponent(targetPath)}`;
  }
};
