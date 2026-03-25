import { describe, it, expect, vi } from "vitest";
import type { McpServer, RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { BitbucketClient } from "../src/client.js";
import { ListRepositoriesTool } from "../src/tools/repositories/index.js";

function mockClient(overrides: Partial<BitbucketClient> = {}): BitbucketClient {
  return {
    workspace: "ws",
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    rawText: vi.fn(),
    ...overrides,
  } as unknown as BitbucketClient;
}

describe("BitbucketMcpTool", () => {
  it("register() calls server.registerTool with name, description, inputSchema, and wires execute to JSON text", async () => {
    const registerTool = vi.fn((_name, _config, _cb): RegisteredTool => ({}) as RegisteredTool);
    const server = { registerTool } as unknown as McpServer;
    const get = vi.fn().mockResolvedValue({
      size: 0,
      page: 1,
      pagelen: 25,
      values: [],
    });
    const client = mockClient({ get });
    const tool = new ListRepositoriesTool();

    tool.register(server, client);

    expect(registerTool).toHaveBeenCalledTimes(1);
    expect(registerTool).toHaveBeenCalledWith(
      "list_repositories",
      expect.objectContaining({
        description: "List all repositories in the configured workspace",
        inputSchema: expect.any(z.ZodType),
      }),
      expect.any(Function),
    );

    const callback = registerTool.mock.calls[0][2] as (
      args: unknown,
      extra: unknown,
    ) => ReturnType<typeof import("../src/tools/helpers.js").toolJsonResult> | Promise<unknown>;

    const result = await callback({ page: 1 }, {});
    expect(result).toMatchObject({
      content: [{ type: "text", text: expect.any(String) }],
    });
    const parsed = JSON.parse((result as { content: Array<{ text: string }> }).content[0].text);
    expect(parsed).toMatchObject({
      total: 0,
      page: 1,
      has_next: false,
      repositories: [],
    });
    expect(get).toHaveBeenCalledWith("/repositories/ws?page=1&pagelen=25");
  });
});
