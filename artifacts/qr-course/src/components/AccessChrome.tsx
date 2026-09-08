import { useEffect, useRef } from "react";
import { CreditCard, Loader2, LogIn, LogOut, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import { formatBillingPrice, useAccess } from "@/lib/access";

const excludedGatePaths = ["/", "/billing/return", "/auth"];

export default function AccessChrome() {
  const gateRef = useRef<HTMLDivElement>(null);
  const [location] = useLocation();
  const {
    access,
    billing,
    loading,
    error,
    refresh,
    signIn,
    checkout,
    portal,
    logout,
  } = useAccess();
  const price = formatBillingPrice(billing);
  const billingUnavailable = billing && (!billing.available || !billing.price);
  const billingReturnPending =
    location.startsWith("/billing/return") && access?.stage !== "paid";
  const gated =
    !excludedGatePaths.some(
      (path) => location === path || (path !== "/" && location.startsWith(path)),
    ) &&
    (access?.stage === "login_required" ||
      access?.stage === "payment_required");

  useEffect(() => {
    const course = document.getElementById("course-route-content");
    if (!gated || !course) return;
    course.inert = true;
    const focusableSelector =
      'button:not([disabled]), a[href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
    const firstGateControl =
      gateRef.current?.querySelector<HTMLElement>(focusableSelector);
    firstGateControl?.focus();
    const containFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const scopedSelectors = focusableSelector
        .split(",")
        .flatMap((selector) => [
          `[data-access-controls] ${selector.trim()}`,
          `[data-access-gate] ${selector.trim()}`,
        ])
        .join(",");
      const controls = Array.from(
        document.querySelectorAll<HTMLElement>(scopedSelectors),
      ).filter((element) => !element.hasAttribute("disabled"));
      if (!controls.length) return;
      const current = controls.indexOf(document.activeElement as HTMLElement);
      const next = event.shiftKey
        ? (current <= 0 ? controls.length - 1 : current - 1)
        : (current < 0 || current === controls.length - 1 ? 0 : current + 1);
      event.preventDefault();
      controls[next]?.focus();
    };
    document.addEventListener("keydown", containFocus);
    return () => {
      course.inert = false;
      document.removeEventListener("keydown", containFocus);
    };
  }, [gated]);

  return (
    <>
      <div data-access-controls className="fixed right-3 top-3 z-[60] flex max-w-[calc(100vw-1.5rem)] flex-wrap items-center justify-end gap-2 sm:right-5">
        {!access?.user && (
          <button
            type="button"
            onClick={() => signIn(false)}
            disabled={loading}
            data-testid="button-google-sign-in"
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium shadow-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
          >
            <LogIn className="h-4 w-4" aria-hidden="true" />
            Sign in with Google
          </button>
        )}
        {access?.user && (
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium shadow-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Sign out ${access.user.displayName}`}
            title={`Signed in as ${access.user.displayName}`}
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        )}
        {access?.stage === "paid" ? (
          <button
            type="button"
            onClick={() => void portal()}
            className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium shadow-md hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <CreditCard className="h-4 w-4" />
            Manage billing
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void checkout()}
            disabled={loading || Boolean(billingUnavailable) || billingReturnPending}
            title={billing?.error}
            className="inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground shadow-md hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
            <span>
              {billingReturnPending
                ? "Verifying payment…"
                : price
                  ? `Pay ${price}`
                  : "Pay"}
            </span>
          </button>
        )}
      </div>

      {gated && (
        <div
          data-access-gate
          ref={gateRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="access-gate-title"
        >
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Preview complete
            </p>
            <h2 id="access-gate-title" className="text-2xl font-semibold">
              {access.stage === "login_required"
                ? "Keep learning with Google"
                : "Unlock the full course"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {access.stage === "login_required"
                ? "Your guest preview has ended. Sign in with Google for an additional free stage, or continue directly to payment."
                : "You have completed the signed-in free stage. Continue with secure Stripe checkout for full access."}
            </p>
            <div className="mt-4 rounded-md bg-secondary p-3 text-sm">
              {access.activeSeconds} of {access.secondsLimit} active seconds used
              <span className="mx-2" aria-hidden="true">·</span>
              {access.actionsUsed} of {access.actionsLimit} AI actions used
            </div>
            {billingUnavailable && (
              <p className="mt-3 text-sm text-destructive" role="alert">
                {billing?.error || "Checkout is temporarily unavailable."}
              </p>
            )}
            <div className="mt-6 flex flex-col gap-2 sm:flex-row">
              {access.stage === "login_required" && (
                <button
                  type="button"
                  onClick={() => signIn(false)}
                  className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <LogIn className="h-4 w-4" />
                  Continue with Google
                </button>
              )}
              <button
                type="button"
                onClick={() => void checkout()}
                disabled={Boolean(billingUnavailable)}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
              >
                <CreditCard className="h-4 w-4" />
                {price ? `Pay ${price}` : "Pay"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!access && !loading && error && (
        <div className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-3 rounded-md border border-destructive/30 bg-background px-4 py-3 shadow-lg" role="alert">
          <span className="text-sm">{error}</span>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1 text-sm font-semibold underline"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}
    </>
  );
}