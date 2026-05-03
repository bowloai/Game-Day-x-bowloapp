import { useEffect, useRef } from "react";

const POLL_INTERVAL_MS = 2 * 60 * 1000; // check every 2 minutes

export function useVersionCheck() {
  const knownBuildId = useRef<string | null>(null);

  useEffect(() => {
    async function check() {
      try {
        const res = await fetch("/api/version", { cache: "no-store" });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (knownBuildId.current === null) {
          knownBuildId.current = buildId;
        } else if (knownBuildId.current !== buildId) {
          window.location.reload();
        }
      } catch {
        // network error — ignore, try again next interval
      }
    }

    check();
    const id = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);
}
