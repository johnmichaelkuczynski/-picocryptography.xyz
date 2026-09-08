import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "@/hooks/use-toast";
import {
  type AccessState,
  type BillingConfig,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { isAdminMode, setAdminMode } from "@/lib/adminMode";

type AccessContextValue = {
  access: AccessState | null;
  billing: BillingConfig | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<AccessState | null>;
  refreshBilling: () => Promise<void>;
  signIn: (checkoutAfter?: boolean) => void;
  checkout: () => Promise<void>;
  portal: () => Promise<void>;
  logout: () => Promise<void>;
};

const AccessContext = createContext<AccessContextValue | null>(null);
const PENDING_CHECKOUT = "qr-course:checkout-after-login";
const REDIRECT_DRAFT = "qr-course:redirect-draft";
export const BILLING_ORIGIN = "qr-course:billing-origin";

let currentCsrfToken = "";
const nativeFetch = window.fetch.bind(window);

// Cover generated clients and existing streaming/manual requests without
// consuming their response bodies. The access GET supplies the token, so this
// interceptor never performs a recursive token fetch.
window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const request = input instanceof Request ? input : null;
  const method = (init.method ?? request?.method ?? "GET").toUpperCase();
  const headers = new Headers(request?.headers);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const requestUrl = new URL(
    request?.url ?? (input instanceof URL ? input.href : String(input)),
    window.location.href,
  );
  const isSameOriginApi =
    requestUrl.origin === window.location.origin &&
    (requestUrl.pathname === "/api" || requestUrl.pathname.startsWith("/api/"));
  if (
    isSameOriginApi &&
    !["GET", "HEAD", "OPTIONS"].includes(method) &&
    currentCsrfToken &&
    !headers.has("X-CSRF-Token")
  ) {
    headers.set("X-CSRF-Token", currentCsrfToken);
  }
  const response = await nativeFetch(input, { ...init, headers });
  if (response.status === 401 || response.status === 402) {
    void response.clone().json().then((body: unknown) => {
      const errorValue =
        body && typeof body === "object"
          ? ((body as { error?: unknown; code?: unknown }).code ??
            (body as { error?: unknown }).error)
          : "";
      const code = typeof errorValue === "string" ? errorValue.toUpperCase() : "";
      if (
        (response.status === 401 && code === "LOGIN_REQUIRED") ||
        (response.status === 402 && code === "PAYMENT_REQUIRED")
      ) {
        window.dispatchEvent(new CustomEvent("qr:access-required"));
      }
    }).catch(() => undefined);
  }
  return response;
};

export async function apiRequest<T>(
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    if (currentCsrfToken) headers.set("X-CSRF-Token", currentCsrfToken);
    if (init.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }
  const response = await fetch(url, {
    ...init,
    headers,
    credentials: "same-origin",
  });
  const data = await response
    .json()
    .catch(() => null) as Record<string, unknown> | null;
  if (!response.ok) {
    const errorValue = data?.code ?? data?.error;
    const code = typeof errorValue === "string" ? errorValue.toUpperCase() : "";
    if (
      (response.status === 401 && code === "LOGIN_REQUIRED") ||
      (response.status === 402 && code === "PAYMENT_REQUIRED")
    ) {
      window.dispatchEvent(new CustomEvent("qr:access-required"));
    }
    const message =
      (typeof data?.message === "string" && data.message) ||
      (typeof data?.error === "string" && data.error) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }
  return data as T;
}

function relativeReturnTo() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  let path = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (base && path.startsWith(base)) path = path.slice(base.length) || "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function preservePageDraft() {
  const selectorFor = (field: HTMLInputElement | HTMLTextAreaElement) => {
    if (field.dataset.draftKey) {
      return `[data-draft-key="${CSS.escape(field.dataset.draftKey)}"]`;
    }
    if (field.dataset.testid) {
      return `[data-testid="${CSS.escape(field.dataset.testid)}"]`;
    }
    if (field.id) return `#${CSS.escape(field.id)}`;
    if (field.name) return `[name="${CSS.escape(field.name)}"]`;
    return null;
  };
  const fields = Array.from(
    document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      "input:not([type=password]), textarea",
    ),
  ).flatMap((field) => {
    const selector = selectorFor(field);
    return selector ? [{ selector, value: field.value }] : [];
  });
  sessionStorage.setItem(
    REDIRECT_DRAFT,
    JSON.stringify({ path: relativeReturnTo(), fields, scrollY: window.scrollY }),
  );
}

function friendlyPrice(config: BillingConfig | null) {
  if (!config?.available || !config.price) return null;
  const { amount, currency, interval, intervalCount } = config.price;
  const value = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
  }).format(amount / 100);
  const recurrence =
    !interval || !intervalCount
      ? null
      : intervalCount === 1
        ? interval
        : `${intervalCount} ${interval}s`;
  if (!recurrence) return value;
  return `${value} / ${recurrence}`;
}

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [access, setAccess] = useState<AccessState | null>(null);
  const [billing, setBilling] = useState<BillingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const checkoutStarting = useRef(false);
  const lastInteraction = useRef(Date.now());

  const refresh = useCallback(async () => {
    try {
      const next = await apiRequest<AccessState>("/api/access");
      currentCsrfToken = next.csrfToken;
      setAccess(next);
      setError(null);
      return next;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to check course access.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBilling = useCallback(async () => {
    try {
      setBilling(await apiRequest<BillingConfig>("/api/billing/config"));
    } catch (cause) {
      setBilling({
        available: false,
        liveMode: false,
        price: null,
        error: cause instanceof Error ? cause.message : "Billing is unavailable.",
      });
    }
  }, []);

  const signIn = useCallback((checkoutAfter = false) => {
    preservePageDraft();
    if (checkoutAfter) localStorage.setItem(PENDING_CHECKOUT, "1");
    else localStorage.removeItem(PENDING_CHECKOUT);
    window.location.assign(
      `/api/auth/google?returnTo=${encodeURIComponent(relativeReturnTo())}`,
    );
  }, []);

  const checkout = useCallback(async () => {
    if (checkoutStarting.current) return;
    if (!access?.user) {
      signIn(true);
      return;
    }
    checkoutStarting.current = true;
    try {
      const savedDraft = sessionStorage.getItem(REDIRECT_DRAFT);
      if (!savedDraft) preservePageDraft();
      let origin = relativeReturnTo();
      if (savedDraft) {
        try {
          origin = (JSON.parse(savedDraft) as { path?: string }).path || origin;
        } catch {
          // A malformed draft is safely replaced with the current page below.
          preservePageDraft();
        }
      }
      localStorage.setItem(BILLING_ORIGIN, origin);
      const result = await apiRequest<{ url: string }>("/api/billing/checkout", {
        method: "POST",
        body: JSON.stringify({ returnTo: "/billing/return" }),
      });
      window.location.assign(result.url);
    } catch (cause) {
      localStorage.removeItem(PENDING_CHECKOUT);
      toast({
        title: "Unable to start checkout",
        description: cause instanceof Error ? cause.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      checkoutStarting.current = false;
    }
  }, [access?.user, signIn]);

  const portal = useCallback(async () => {
    try {
      const result = await apiRequest<{ url: string }>("/api/billing/portal", {
        method: "POST",
        body: "{}",
      });
      window.location.assign(result.url);
    } catch (cause) {
      toast({
        title: "Unable to open billing",
        description: cause instanceof Error ? cause.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/api/auth/logout", { method: "POST", body: "{}" });
      localStorage.removeItem(PENDING_CHECKOUT);
      localStorage.removeItem(BILLING_ORIGIN);
      sessionStorage.removeItem(REDIRECT_DRAFT);
      currentCsrfToken = "";
      setAccess(null);
      queryClient.clear();
      const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
      window.location.assign(basePath || "/");
    } catch (cause) {
      toast({
        title: "Sign out failed",
        description: cause instanceof Error ? cause.message : "Please try again.",
        variant: "destructive",
      });
    }
  }, [queryClient]);

  useEffect(() => {
    void Promise.all([refresh(), refreshBilling()]);
  }, [refresh, refreshBilling]);

  useEffect(() => {
    const markActive = () => {
      lastInteraction.current = Date.now();
    };
    const events = ["pointerdown", "keydown", "scroll"] as const;
    events.forEach((event) =>
      window.addEventListener(event, markActive, { passive: true }),
    );
    return () =>
      events.forEach((event) => window.removeEventListener(event, markActive));
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem(REDIRECT_DRAFT);
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as {
        path: string;
        fields: Array<{ selector: string; value: string }>;
        scrollY: number;
      };
      if (draft.path !== relativeReturnTo()) return;
      window.setTimeout(() => {
        const inputValue = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype,
          "value",
        )?.set;
        const textValue = Object.getOwnPropertyDescriptor(
          HTMLTextAreaElement.prototype,
          "value",
        )?.set;
        draft.fields.forEach(({ selector, value }) => {
          const matches =
            document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(selector);
          if (matches.length !== 1) return;
          const field = matches[0];
          (field instanceof HTMLTextAreaElement ? textValue : inputValue)?.call(field, value);
          field.dispatchEvent(new Event("input", { bubbles: true }));
        });
        window.scrollTo({ top: draft.scrollY });
        sessionStorage.removeItem(REDIRECT_DRAFT);
      }, 250);
    } catch {
      sessionStorage.removeItem(REDIRECT_DRAFT);
    }
  }, []);

  useEffect(() => {
    const timer = window.setInterval(async () => {
      if (
        document.visibilityState !== "visible" ||
        Date.now() - lastInteraction.current > 120_000 ||
        access?.stage === "paid"
      ) return;
      try {
        const next = await apiRequest<AccessState>("/api/access/heartbeat", {
          method: "POST",
          body: "{}",
        });
        currentCsrfToken = next.csrfToken;
        setAccess(next);
      } catch {
        await refresh();
      }
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [access?.stage, refresh]);

  useEffect(() => {
    const onRequired = () => {
      void refresh();
      toast({
        title: "Your preview limit has been reached",
        description: "Sign in or continue with full course access.",
      });
    };
    window.addEventListener("qr:access-required", onRequired);
    window.addEventListener("bam:login-required", onRequired);
    return () => {
      window.removeEventListener("qr:access-required", onRequired);
      window.removeEventListener("bam:login-required", onRequired);
    };
  }, [refresh]);

  useEffect(() => {
    if (!access?.user || localStorage.getItem(PENDING_CHECKOUT) !== "1") return;
    const timer = window.setTimeout(() => {
      localStorage.removeItem(PENDING_CHECKOUT);
      void checkout();
    }, 400);
    return () => window.clearTimeout(timer);
  }, [access?.user, checkout]);

  useEffect(() => {
    if (access && access.user?.isAdmin !== true && isAdminMode()) setAdminMode(false);
  }, [access]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authFailure =
      params.get("auth") === "canceled" ||
      params.has("auth_error") ||
      (params.has("error") && !window.location.pathname.includes("/billing/return"));
    if (authFailure) {
      localStorage.removeItem(PENDING_CHECKOUT);
      toast({
        title: "Google sign-in was not completed",
        description: "Nothing was changed. You can try again when you are ready.",
        variant: "destructive",
      });
    }
  }, []);

  const value = useMemo(
    () => ({
      access,
      billing,
      loading,
      error,
      refresh,
      refreshBilling,
      signIn,
      checkout,
      portal,
      logout,
    }),
    [access, billing, loading, error, refresh, refreshBilling, signIn, checkout, portal, logout],
  );

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const context = useContext(AccessContext);
  if (!context) throw new Error("useAccess must be used inside AccessProvider");
  return context;
}

export function formatBillingPrice(config: BillingConfig | null) {
  return friendlyPrice(config);
}