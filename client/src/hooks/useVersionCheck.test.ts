import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { checkForAppUpdate, isSafeUpdatePath, useVersionCheck } from "./useVersionCheck";

function response(buildId: string, ok = true) {
  return Promise.resolve({
    ok,
    json: () => Promise.resolve({ buildId }),
  } as Response);
}

function storage(value: string | null = null) {
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn(),
  };
}

describe("automatic app updates", () => {
  const reload = vi.fn();
  const updateServiceWorker = vi.fn(() => Promise.resolve());

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it("does not reload when the running client matches the deployment", async () => {
    await checkForAppUpdate({
      clientBuildId: "200",
      fetchVersion: vi.fn(() => response("200")),
      reload,
      updateServiceWorker,
    });

    expect(reload).not.toHaveBeenCalled();
    expect(updateServiceWorker).not.toHaveBeenCalled();
  });

  it("reloads once after a new deployment and updates the service worker", async () => {
    const attemptStorage = storage();

    await checkForAppUpdate({
      clientBuildId: "100",
      fetchVersion: vi.fn(() => response("200")),
      getPathname: () => "/",
      reload,
      updateServiceWorker,
      attemptStorage,
      now: () => 1_000,
    });

    expect(updateServiceWorker).toHaveBeenCalledOnce();
    expect(attemptStorage.setItem).toHaveBeenCalledOnce();
    expect(reload).toHaveBeenCalledOnce();
  });

  it("deduplicates simultaneous lifecycle checks", async () => {
    let resolveFetch!: (value: Response) => void;
    const fetchVersion = vi.fn(() => new Promise<Response>((resolve) => {
      resolveFetch = resolve;
    }));

    const first = checkForAppUpdate({
      clientBuildId: "100",
      fetchVersion,
      reload,
      updateServiceWorker,
    });
    const second = checkForAppUpdate({
      clientBuildId: "100",
      fetchVersion,
      reload,
      updateServiceWorker,
    });

    expect(first).toBe(second);
    expect(fetchVersion).toHaveBeenCalledOnce();
    resolveFetch(await response("100"));
    await first;
  });

  it("defers updates on recording and form routes, including trailing slashes", async () => {
    for (const pathname of [
      "/new-game",
      "/new-game/",
      "/play/abc",
      "/play/abc/",
      "/games/abc/edit",
      "/games/abc/edit/",
    ]) {
      await checkForAppUpdate({
        clientBuildId: "100",
        fetchVersion: vi.fn(() => response("200")),
        getPathname: () => pathname,
        reload,
        updateServiceWorker,
      });
    }

    expect(reload).not.toHaveBeenCalled();
  });

  it("rechecks the current route after waiting for the service worker", async () => {
    let pathname = "/";
    const update = vi.fn(async () => {
      pathname = "/new-game";
    });

    await checkForAppUpdate({
      clientBuildId: "100",
      fetchVersion: vi.fn(() => response("200")),
      getPathname: () => pathname,
      reload,
      updateServiceWorker: update,
    });

    expect(reload).not.toHaveBeenCalled();
  });

  it("prevents a repeated reload when fresh HTML was not obtained", async () => {
    const previousAttempt = JSON.stringify({ buildId: "200", attemptedAt: 1_000 });
    const attemptStorage = storage(previousAttempt);

    await checkForAppUpdate({
      clientBuildId: "100",
      fetchVersion: vi.fn(() => response("200")),
      reload,
      attemptStorage,
      now: () => 2_000,
    });

    expect(reload).not.toHaveBeenCalled();
  });

  it("tolerates network and denied-storage failures without a reload loop", async () => {
    await expect(checkForAppUpdate({
      fetchVersion: vi.fn(() => Promise.reject(new Error("offline"))),
      reload,
    })).resolves.toBeUndefined();

    const deniedStorage = {
      getItem: vi.fn(() => { throw new Error("denied"); }),
      setItem: vi.fn(() => { throw new Error("denied"); }),
    };
    for (let attempt = 0; attempt < 2; attempt += 1) {
      await expect(checkForAppUpdate({
        clientBuildId: "100",
        fetchVersion: vi.fn(() => response("200")),
        reload,
        updateServiceWorker,
        attemptStorage: deniedStorage,
      })).resolves.toBeUndefined();
    }

    expect(reload).not.toHaveBeenCalled();
  });

  it("checks again when the home-screen app returns to the foreground", async () => {
    const fetchVersion = vi.fn(() => response("test"));
    vi.stubGlobal("fetch", fetchVersion);

    const { unmount } = renderHook(() => useVersionCheck());
    await waitFor(() => expect(fetchVersion).toHaveBeenCalledOnce());

    act(() => window.dispatchEvent(new Event("focus")));
    await waitFor(() => expect(fetchVersion).toHaveBeenCalledTimes(2));

    unmount();
    vi.unstubAllGlobals();
  });

  it("identifies routes where reloads would lose active input", () => {
    expect(isSafeUpdatePath("/")).toBe(true);
    expect(isSafeUpdatePath("/analysis/")).toBe(true);
    expect(isSafeUpdatePath("/new-game/")).toBe(false);
    expect(isSafeUpdatePath("/play/123/")).toBe(false);
    expect(isSafeUpdatePath("/games/123/edit/")).toBe(false);
  });
});