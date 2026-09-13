import { useEffect } from "react";

const POLL_INTERVAL_MS = 2 * 60 * 1000;
const RELOAD_ATTEMPT_KEY = "gameday:update-attempt";
const RELOAD_RETRY_MS = 5 * 60 * 1000;

export const APP_BUILD_ID =
  typeof __APP_BUILD_ID__ === "undefined" ? "test" : __APP_BUILD_ID__;

type UpdateCheckOptions = {
  clientBuildId?: string;
  fetchVersion?: typeof fetch;
  getPathname?: () => string;
  reload?: () => void;
  updateServiceWorker?: () => Promise<unknown>;
  attemptStorage?: Pick<Storage, "getItem" | "setItem">;
  now?: () => number;
};

type ReloadAttempt = {
  buildId: string;
  attemptedAt: number;
};

let activeCheck: Promise<void> | null = null;

export function isSafeUpdatePath(pathname: string): boolean {
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  return normalized !== "/new-game"
    && !normalized.startsWith("/play/")
    && !/^\/games\/[^/]+\/edit$/.test(normalized);
}

function readAttempt(
  storage: Pick<Storage, "getItem">,
  buildId: string,
  now: number,
): boolean {
  try {
    const raw = storage.getItem(RELOAD_ATTEMPT_KEY);
    if (!raw) return false;
    const attempt = JSON.parse(raw) as ReloadAttempt;
    return attempt.buildId === buildId && now - attempt.attemptedAt < RELOAD_RETRY_MS;
  } catch {
    return false;
  }
}

function writeAttempt(
  storage: Pick<Storage, "setItem">,
  buildId: string,
  now: number,
): boolean {
  try {
    storage.setItem(RELOAD_ATTEMPT_KEY, JSON.stringify({ buildId, attemptedAt: now }));
    return true;
  } catch {
    // Without a reload-persistent marker, reloading stale HTML could create a loop.
    return false;
  }
}

async function runUpdateCheck(options: UpdateCheckOptions) {
  const clientBuildId = options.clientBuildId ?? APP_BUILD_ID;
  const fetchVersion = options.fetchVersion ?? fetch;
  const getPathname = options.getPathname ?? (() => window.location.pathname);
  const reload = options.reload ?? (() => window.location.reload());
  const attemptStorage = options.attemptStorage ?? window.sessionStorage;
  const now = options.now ?? Date.now;
  const updateServiceWorker = options.updateServiceWorker ?? (async () => {
    if (!("serviceWorker" in navigator)) return;
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });

  try {
    const res = await fetchVersion("/api/version", { cache: "no-store" });
    if (!res.ok) return;

    const data = await res.json();
    const serverBuildId = typeof data.buildId === "string" ? data.buildId : null;
    if (!serverBuildId || serverBuildId === clientBuildId) return;
    if (!isSafeUpdatePath(getPathname())) return;
    if (readAttempt(attemptStorage, serverBuildId, now())) return;

    await updateServiceWorker().catch(() => {});

    // The user may have navigated into a form while the network checks were running.
    if (!isSafeUpdatePath(getPathname())) return;

    if (!writeAttempt(attemptStorage, serverBuildId, now())) return;
    reload();
  } catch {
    // Offline, malformed responses, and denied storage are retried later.
  }
}

export function checkForAppUpdate(options: UpdateCheckOptions = {}) {
  if (activeCheck) return activeCheck;
  activeCheck = runUpdateCheck(options).finally(() => {
    activeCheck = null;
  });
  return activeCheck;
}

export function useVersionCheck() {
  useEffect(() => {
    const check = () => void checkForAppUpdate();
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") check();
    };

    check();
    window.addEventListener("focus", check);
    window.addEventListener("pageshow", check);
    document.addEventListener("visibilitychange", checkWhenVisible);
    const id = window.setInterval(check, POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener("focus", check);
      window.removeEventListener("pageshow", check);
      document.removeEventListener("visibilitychange", checkWhenVisible);
      window.clearInterval(id);
    };
  }, []);
}