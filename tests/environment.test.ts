import { afterEach, describe, expect, test, vi } from "vitest";
import { getApiUrl, isEmbeddedPreview } from "../src/client/environment.js";

describe("client environment", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  test("uses relative API paths in browser mode", () => {
    vi.stubGlobal("window", {});

    expect(getApiUrl("/api/project")).toBe("/api/project");
    expect(isEmbeddedPreview()).toBe(false);
  });

  test("uses the injected API base URL in embedded mode", () => {
    vi.stubGlobal("window", {
      __UI_CLAPS_API_BASE_URL__: "http://localhost:4500",
      __UI_CLAPS_EMBEDDED__: true,
    });

    expect(getApiUrl("/api/project")).toBe("http://localhost:4500/api/project");
    expect(isEmbeddedPreview()).toBe(true);
  });
});
