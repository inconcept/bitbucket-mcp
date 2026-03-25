import { describe, it, expect, vi, afterEach } from "vitest";
import { parseConfig, loadConfig } from "../src/config.js";

describe("parseConfig", () => {
  it("accepts valid env with explicit base URL", () => {
    const result = parseConfig({
      BITBUCKET_USERNAME: "user",
      BITBUCKET_APP_PASSWORD: "secret",
      BITBUCKET_WORKSPACE: "ws",
      BITBUCKET_BASE_URL: "https://api.bitbucket.org/2.0",
    });
    expect(result).toEqual({
      success: true,
      data: {
        BITBUCKET_USERNAME: "user",
        BITBUCKET_APP_PASSWORD: "secret",
        BITBUCKET_WORKSPACE: "ws",
        BITBUCKET_BASE_URL: "https://api.bitbucket.org/2.0",
        allowDestructiveTools: false,
      },
    });
  });

  it("applies default BITBUCKET_BASE_URL when omitted", () => {
    const result = parseConfig({
      BITBUCKET_USERNAME: "user",
      BITBUCKET_APP_PASSWORD: "secret",
      BITBUCKET_WORKSPACE: "ws",
    });
    expect(result).toEqual({
      success: true,
      data: {
        BITBUCKET_USERNAME: "user",
        BITBUCKET_APP_PASSWORD: "secret",
        BITBUCKET_WORKSPACE: "ws",
        BITBUCKET_BASE_URL: "https://api.bitbucket.org/2.0",
        allowDestructiveTools: false,
      },
    });
  });

  it("sets allowDestructiveTools from BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS", () => {
    for (const v of ["true", "TRUE", "1", "yes", "On"]) {
      const result = parseConfig({
        BITBUCKET_USERNAME: "user",
        BITBUCKET_APP_PASSWORD: "secret",
        BITBUCKET_WORKSPACE: "ws",
        BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS: v,
      });
      expect(result).toMatchObject({
        success: true,
        data: { allowDestructiveTools: true },
      });
    }
    const off = parseConfig({
      BITBUCKET_USERNAME: "user",
      BITBUCKET_APP_PASSWORD: "secret",
      BITBUCKET_WORKSPACE: "ws",
      BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS: "false",
    });
    expect(off).toMatchObject({
      success: true,
      data: { allowDestructiveTools: false },
    });
  });

  it("fails when required keys are missing", () => {
    const result = parseConfig({
      BITBUCKET_USERNAME: "user",
      BITBUCKET_APP_PASSWORD: "secret",
    });
    expect(result.success).toBe(false);
  });

  it("fails when BITBUCKET_BASE_URL is not a valid URL", () => {
    const result = parseConfig({
      BITBUCKET_USERNAME: "user",
      BITBUCKET_APP_PASSWORD: "secret",
      BITBUCKET_WORKSPACE: "ws",
      BITBUCKET_BASE_URL: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});

describe("loadConfig", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prints errors and exits when env is invalid", () => {
    const exit = vi.spyOn(process, "exit").mockImplementation((code?: string | number | null) => {
      throw new Error(`exit:${code}`);
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubEnv("BITBUCKET_USERNAME", "");
    vi.stubEnv("BITBUCKET_APP_PASSWORD", "x");
    vi.stubEnv("BITBUCKET_WORKSPACE", "w");
    expect(() => loadConfig()).toThrow("exit:1");
    expect(err).toHaveBeenCalled();
    expect(exit).toHaveBeenCalledWith(1);
  });

  it("returns config when env is valid", () => {
    vi.stubEnv("BITBUCKET_USERNAME", "u");
    vi.stubEnv("BITBUCKET_APP_PASSWORD", "p");
    vi.stubEnv("BITBUCKET_WORKSPACE", "ws");
    const c = loadConfig();
    expect(c.BITBUCKET_WORKSPACE).toBe("ws");
  });
});
