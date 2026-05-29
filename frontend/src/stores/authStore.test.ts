import { beforeEach, describe, expect, it } from "vitest";

import { useAuthStore } from "./authStore";

describe("authStore", () => {
  beforeEach(() => {
    localStorage.clear();
    useAuthStore.getState().reset();
  });

  it("persists the access token to localStorage", () => {
    useAuthStore.getState().setAccessToken("tok123");
    expect(localStorage.getItem("idealens_access_token")).toBe("tok123");
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it("clears token and user on reset", () => {
    useAuthStore.getState().setAccessToken("tok123");
    useAuthStore.getState().setUser({
      id: "1",
      email: "a@b.com",
      has_api_key: false,
      created_at: "2026-01-01",
    });
    useAuthStore.getState().reset();
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(localStorage.getItem("idealens_access_token")).toBeNull();
  });
});
