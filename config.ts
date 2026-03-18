import { z } from "zod";

const ConfigSchema = z.object({
  BITBUCKET_USERNAME:     z.string().min(1, "BITBUCKET_USERNAME is required"),
  BITBUCKET_APP_PASSWORD: z.string().min(1, "BITBUCKET_APP_PASSWORD is required"),
  BITBUCKET_WORKSPACE:    z.string().min(1, "BITBUCKET_WORKSPACE is required"),
  BITBUCKET_BASE_URL:     z.string().url().default("https://api.bitbucket.org/2.0"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.errors.map((e) => `  • ${e.path.join(".")}: ${e.message}`).join("\n");
    console.error(`\n[bitbucket-mcp] Configuration error:\n${missing}\n`);
    console.error("Set these environment variables and restart.\n");
    process.exit(1);
  }
  return result.data;
}
