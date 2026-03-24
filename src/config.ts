import { z } from "zod";

/** True for common affirmative env strings (case-insensitive). */
export function parseOptionalBoolEnv(value: string | undefined): boolean {
  if (value === undefined || value === "") return false;
  return ["1", "true", "yes", "on"].includes(value.trim().toLowerCase());
}

const ConfigSchema = z
  .object({
    BITBUCKET_USERNAME: z.string().min(1, "BITBUCKET_USERNAME is required"),
    BITBUCKET_APP_PASSWORD: z.string().min(1, "BITBUCKET_APP_PASSWORD is required"),
    BITBUCKET_WORKSPACE: z.string().min(1, "BITBUCKET_WORKSPACE is required"),
    BITBUCKET_BASE_URL: z.string().url().default("https://api.bitbucket.org/2.0"),
    BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS: z.string().optional(),
  })
  .transform((data) => ({
    BITBUCKET_USERNAME: data.BITBUCKET_USERNAME,
    BITBUCKET_APP_PASSWORD: data.BITBUCKET_APP_PASSWORD,
    BITBUCKET_WORKSPACE: data.BITBUCKET_WORKSPACE,
    BITBUCKET_BASE_URL: data.BITBUCKET_BASE_URL,
    allowDestructiveTools: parseOptionalBoolEnv(data.BITBUCKET_MCP_ALLOW_DESTRUCTIVE_TOOLS),
  }));

export type Config = z.infer<typeof ConfigSchema>;

/** Parse env into config; use in tests without touching `process.exit`. */
export function parseConfig(env: NodeJS.ProcessEnv) {
  return ConfigSchema.safeParse(env);
}

export function loadConfig(): Config {
  const result = parseConfig(process.env);
  if (!result.success) {
    const missing = result.error.errors
      .map((e) => `  • ${e.path.join(".")}: ${e.message}`)
      .join("\n");
    console.error(`\n[bitbucket-mcp] Configuration error:\n${missing}\n`);
    console.error("Set these environment variables and restart.\n");
    process.exit(1);
  }
  return result.data;
}
