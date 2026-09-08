import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, RotateCcw, XCircle } from "lucide-react";
import {
  apiRequest,
  ApiRequestError,
  BILLING_ORIGIN,
  useAccess,
} from "@/lib/access";

type Status = "verifying" | "paid" | "unpaid" | "error";

export default function BillingReturn() {
  const { refresh } = useAccess();
  const [status, setStatus] = useState<Status>("verifying");
  const [message, setMessage] = useState("");
  const courseReturnTo = localStorage.getItem(BILLING_ORIGIN) || "/dashboard";
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
  const courseHref = `${basePath}${courseReturnTo}`;

  async function recoverExistingPayment(): Promise<boolean> {
    const billingStatus = await apiRequest<{ paid: boolean }>("/api/billing/status");
    const nextAccess = await refresh();
    return billingStatus.paid || nextAccess?.stage === "paid";
  }

  async function verify() {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id") ?? params.get("sessionId");
    if (!sessionId) {
      setStatus("verifying");
      setMessage("");
      try {
        const paid = await recoverExistingPayment();
        if (paid) {
          setStatus("paid");
          setMessage("Your existing payment is active. Full course access is now available.");
        } else {
          setStatus("unpaid");
          setMessage(
            "No completed payment could be confirmed. Checkout may have been canceled or may still be processing. Do not start another payment while one is pending; retry this status check first.",
          );
        }
      } catch {
        setStatus("error");
        setMessage(
          "We could not check the existing payment. Payment may have succeeded. DO NOT PAY AGAIN. Retry verification of the existing payment below.",
        );
      }
      return;
    }
    setStatus("verifying");
    setMessage("");
    try {
      const result = await apiRequest<{ paid: boolean }>("/api/billing/verify", {
        method: "POST",
        body: JSON.stringify({ sessionId }),
      });
      const nextAccess = await refresh();
      if (result.paid || nextAccess?.stage === "paid") {
        setStatus("paid");
        setMessage("Stripe confirmed your payment. Full course access is now active.");
      } else {
        setStatus("unpaid");
        setMessage("Stripe has not confirmed payment. Your access has not changed.");
      }
    } catch (cause) {
      try {
        const paid = await recoverExistingPayment();
        if (paid) {
          setStatus("paid");
          setMessage("Your existing payment is active. Full course access is now available.");
          return;
        }
      } catch {
        // Keep the original verification failure as the diagnostic detail.
      }
      const safeCode =
        cause instanceof ApiRequestError && /^[A-Z0-9_]+$/.test(cause.code)
          ? cause.code
          : null;
      const detail =
        cause instanceof ApiRequestError
          ? ` (${safeCode || `HTTP ${cause.status}`})`
          : "";
      setStatus("error");
      setMessage(
        `We could not confirm the existing payment${detail}. Payment may have succeeded. DO NOT PAY AGAIN. Retry verification of the existing payment below.`,
      );
    }
  }

  useEffect(() => {
    void verify();
  }, []);

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-background p-5 text-foreground">
      <section className="w-full max-w-lg rounded-lg border border-border bg-card p-7 shadow-sm" aria-live="polite">
        {status === "verifying" && <Loader2 className="mb-5 h-10 w-10 animate-spin text-primary" />}
        {status === "paid" && <CheckCircle2 className="mb-5 h-10 w-10 text-green-600" />}
        {(status === "unpaid" || status === "error") && <XCircle className="mb-5 h-10 w-10 text-destructive" />}
        <h1 className="text-2xl font-semibold">
          {status === "verifying" && "Confirming your payment"}
          {status === "paid" && "Payment confirmed"}
          {status === "unpaid" && "Payment not confirmed"}
          {status === "error" && "We could not verify payment"}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          {status === "verifying"
            ? "Please wait while Stripe verifies your checkout. Access is not unlocked by this redirect alone."
            : message}
        </p>
        {status !== "verifying" && (
          <div className="mt-6 flex flex-wrap gap-2">
            {(status === "unpaid" || status === "error") && (
              <button
                type="button"
                onClick={() => void verify()}
                className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-secondary"
              >
                <RotateCcw className="h-4 w-4" />
                Retry existing payment
              </button>
            )}
            <a href={courseHref}>
              <span className="inline-flex min-h-10 cursor-pointer items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
                Return to course
              </span>
            </a>
          </div>
        )}
      </section>
    </main>
  );
}