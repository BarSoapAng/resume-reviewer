import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";

const auth = vi.hoisted(() => ({ onAuthStateChange: vi.fn(), getSession: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ auth }) }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.clearAllMocks();
});

describe("session lifecycle", () => {
  it("uses auth events for restored, signed-in, refreshed, and signed-out sessions", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
    let emit!: (event: AuthChangeEvent, session: Session | null) => void;
    const unsubscribe = vi.fn();
    auth.onAuthStateChange.mockImplementation((callback) => {
      emit = callback;
      return { data: { subscription: { unsubscribe } } };
    });
    // An independent startup read must not overwrite a newer sign-in event.
    auth.getSession.mockResolvedValue({ data: { session: null } });
    const { watchSession } = await import("./supabase");
    const onSession = vi.fn();
    const stop = watchSession(onSession);
    const session = { user: { email: "student@example.com" } } as Session;
    emit("INITIAL_SESSION", session);
    emit("SIGNED_IN", session);
    emit("TOKEN_REFRESHED", session);
    await Promise.resolve();
    expect(onSession).toHaveBeenLastCalledWith(session);
    expect(auth.getSession).not.toHaveBeenCalled();
    emit("SIGNED_OUT", null);
    expect(onSession).toHaveBeenLastCalledWith(null);
    stop();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("cleans up safely when Supabase is not configured", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "");
    const { watchSession } = await import("./supabase");
    expect(() => watchSession(vi.fn())()).not.toThrow();
    expect(auth.onAuthStateChange).not.toHaveBeenCalled();
  });
});
