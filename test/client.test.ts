import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { BitbucketClient } from "../src/client.js";
import type { Config } from "../src/config.js";

const sampleConfig: Config = {
  BITBUCKET_USERNAME: "user",
  BITBUCKET_APP_PASSWORD: "app-pass",
  BITBUCKET_WORKSPACE: "my-ws",
  BITBUCKET_BASE_URL: "https://api.bitbucket.org/2.0",
};

describe("BitbucketClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses JSON on successful GET", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true, n: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = new BitbucketClient(sampleConfig);
    await expect(client.get("/repos")).resolves.toEqual({ ok: true, n: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/repos",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
  });

  it("returns empty object when response body is empty", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.get("/empty")).resolves.toEqual({});
  });

  it("throws with Bitbucket error.message when present", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: "not found" } }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = new BitbucketClient(sampleConfig);
    await expect(client.get("/missing")).rejects.toThrow("HTTP 404: not found");
  });

  it("throws with body snippet when error JSON has no message field", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: {} }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      })
    );
    const client = new BitbucketClient(sampleConfig);
    await expect(client.get("/bad")).rejects.toThrow("HTTP 500");
  });

  it("throws with truncated body on non-JSON error response", async () => {
    const longBody = "x".repeat(300);
    vi.mocked(fetch).mockResolvedValueOnce(new Response(longBody, { status: 502 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.get("/plain")).rejects.toThrow(`HTTP 502: ${longBody.slice(0, 200)}`);
  });

  it("rawText returns body on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("diff --git", { status: 200 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.rawText("/diff")).resolves.toBe("diff --git");
  });

  it("rawText throws on non-OK status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 404 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.rawText("/x")).rejects.toThrow("HTTP 404");
  });

  it("post sends JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ id: 1 }), { status: 201 })
    );
    const client = new BitbucketClient(sampleConfig);
    await expect(client.post("/pr", { title: "t" })).resolves.toEqual({ id: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/pr",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ title: "t" }),
      })
    );
  });

  it("put sends JSON body", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.put("/x", { a: 1 })).resolves.toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/x",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ a: 1 }),
      })
    );
  });

  it("delete issues DELETE request", async () => {
    // Node's Response rejects status 204 with empty body in some versions; 200 + empty is fine for client.
    vi.mocked(fetch).mockResolvedValueOnce(new Response("", { status: 200 }));
    const client = new BitbucketClient(sampleConfig);
    await expect(client.delete("/ref")).resolves.toEqual({});
    expect(fetch).toHaveBeenCalledWith(
      "https://api.bitbucket.org/2.0/ref",
      expect.objectContaining({ method: "DELETE" })
    );
  });
});
