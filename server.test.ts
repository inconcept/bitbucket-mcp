import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSONRPC_VERSION, LATEST_PROTOCOL_VERSION } from "@modelcontextprotocol/sdk/types.js";
import { createServer, startServer } from "./server.js";
import type { Config } from "./config.js";

vi.mock("@modelcontextprotocol/sdk/server/stdio.js", () => ({
  // `new StdioServerTransport()` in startServer requires a constructable class.
  StdioServerTransport: class {
    async start() {}
    async send() {
      return Promise.resolve();
    }
    async close() {}
    onmessage?: (msg: unknown, extra?: unknown) => void;
    onclose?: () => void;
    onerror?: (e: unknown) => void;
  },
}));

const baseConfig: Config = {
  BITBUCKET_USERNAME: "u",
  BITBUCKET_APP_PASSWORD: "p",
  BITBUCKET_WORKSPACE: "ws",
  BITBUCKET_BASE_URL: "https://api.bitbucket.org/2.0",
};

/** Collect JSON-RPC responses the server sends back through the transport. */
function createMockTransport() {
  const sent: unknown[] = [];
  const transport = {
    async start() {},
    async send(message: unknown) {
      sent.push(message);
    },
    async close() {},
    onmessage: undefined as ((msg: unknown, extra?: unknown) => void) | undefined,
    onclose: undefined as (() => void) | undefined,
    onerror: undefined as ((e: unknown) => void) | undefined,
  };
  return { transport, sent };
}

async function flushResponses() {
  for (let i = 0; i < 30; i++) {
    await Promise.resolve();
  }
}

describe("createServer", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("handles tools/list after initialize", async () => {
    const { transport, sent } = createMockTransport();
    const server = await createServer(baseConfig);
    await server.connect(transport);

    const inbound = transport.onmessage;
    if (!inbound) throw new Error("expected transport.onmessage after connect");

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "test-client", version: "0.0.0" },
      },
    });
    await flushResponses();
    expect(sent.some((m) => isResultForId(m, 1))).toBe(true);

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 2,
      method: "tools/list",
      params: {},
    });
    await flushResponses();

    const listRes = sent.find((m) => isResultForId(m, 2)) as
      | { result?: { tools?: Array<{ name: string }> } }
      | undefined;
    expect(listRes?.result?.tools?.length).toBeGreaterThan(0);
    expect(listRes?.result?.tools?.some((t) => t.name === "list_repositories")).toBe(true);
  });

  it("returns error for unknown tool name", async () => {
    const { transport, sent } = createMockTransport();
    const server = await createServer(baseConfig);
    await server.connect(transport);
    const inbound = transport.onmessage!;

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "t", version: "1" },
      },
    });
    await flushResponses();

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 2,
      method: "tools/call",
      params: { name: "no_such_tool_xyz", arguments: {} },
    });
    await flushResponses();

    const res = sent.find((m) => isResultForId(m, 2)) as { result?: { isError?: boolean; content?: Array<{ text?: string }> } };
    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toContain("Unknown tool");
  });

  it("returns Zod error text for invalid tool arguments", async () => {
    const { transport, sent } = createMockTransport();
    const server = await createServer(baseConfig);
    await server.connect(transport);
    const inbound = transport.onmessage!;

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "t", version: "1" },
      },
    });
    await flushResponses();

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 2,
      method: "tools/call",
      params: {
        name: "list_repositories",
        arguments: { page: "not-a-number" },
      },
    });
    await flushResponses();

    const res = sent.find((m) => isResultForId(m, 2)) as { result?: { isError?: boolean; content?: Array<{ text?: string }> } };
    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toMatch(/Error:/);
  });

  it("returns isError when the tool handler fails", async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error("upstream down"));
    const { transport, sent } = createMockTransport();
    const server = await createServer(baseConfig);
    await server.connect(transport);
    const inbound = transport.onmessage!;

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "t", version: "1" },
      },
    });
    await flushResponses();

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 2,
      method: "tools/call",
      params: {
        name: "list_repositories",
        arguments: { page: 1 },
      },
    });
    await flushResponses();

    const res = sent.find((m) => isResultForId(m, 2)) as { result?: { isError?: boolean; content?: Array<{ text?: string }> } };
    expect(res?.result?.isError).toBe(true);
    expect(res?.result?.content?.[0]?.text).toContain("upstream down");
  });

  it("returns JSON tool result on success", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          size: 0,
          page: 1,
          pagelen: 25,
          values: [],
        }),
        { status: 200 }
      )
    );
    const { transport, sent } = createMockTransport();
    const server = await createServer(baseConfig);
    await server.connect(transport);
    const inbound = transport.onmessage!;

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: LATEST_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: "t", version: "1" },
      },
    });
    await flushResponses();

    inbound({
      jsonrpc: JSONRPC_VERSION,
      id: 2,
      method: "tools/call",
      params: {
        name: "list_repositories",
        arguments: { page: 1 },
      },
    });
    await flushResponses();

    const res = sent.find((m) => isResultForId(m, 2)) as { result?: { isError?: boolean; content?: Array<{ text?: string }> } };
    expect(res?.result?.isError).toBeFalsy();
    const text = res?.result?.content?.[0]?.text ?? "";
    expect(JSON.parse(text)).toMatchObject({ total: 0, repositories: [] });
  });
});

describe("startServer", () => {
  it("connects stdio transport and logs", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await startServer(baseConfig);
    expect(log).toHaveBeenCalledWith("[bitbucket-mcp] Server running on stdio");
    log.mockRestore();
  });
});

function isResultForId(message: unknown, id: number): boolean {
  return (
    typeof message === "object" &&
    message !== null &&
    "id" in message &&
    (message as { id: unknown }).id === id &&
    "result" in message
  );
}
