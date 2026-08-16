// Detects the server's "anonymous free preview exhausted" response on raw
// fetch() calls and raises the same app-wide event the shared API client
// dispatches, so the Google sign-in modal appears consistently.
export async function checkLoginRequired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  try {
    const data = (await res.clone().json()) as { error?: string };
    if (data?.error === "login_required") {
      window.dispatchEvent(new CustomEvent("bam:login-required"));
      return true;
    }
  } catch {
    // non-JSON 401: not ours
  }
  return false;
}
