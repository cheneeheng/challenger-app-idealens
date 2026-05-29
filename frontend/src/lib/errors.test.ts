import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { getApiErrorMessage } from "./errors";

describe("getApiErrorMessage", () => {
  it("extracts FastAPI detail strings", () => {
    const err = new AxiosError("boom");
    err.response = { data: { detail: "Email already registered" } } as never;
    expect(getApiErrorMessage(err)).toBe("Email already registered");
  });

  it("extracts the first validation error message", () => {
    const err = new AxiosError("boom");
    err.response = { data: { detail: [{ msg: "field required" }] } } as never;
    expect(getApiErrorMessage(err)).toBe("field required");
  });

  it("falls back for non-axios errors", () => {
    expect(getApiErrorMessage(new Error("x"), "fallback")).toBe("fallback");
  });
});
