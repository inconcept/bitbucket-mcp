import type { Config } from "./config.js";

export class BitbucketClient {
  private readonly auth: string;
  private readonly baseUrl: string;
  readonly workspace: string;

  constructor(config: Config) {
    this.auth      = Buffer.from(`${config.BITBUCKET_USERNAME}:${config.BITBUCKET_APP_PASSWORD}`).toString("base64");
    this.baseUrl   = config.BITBUCKET_BASE_URL;
    this.workspace = config.BITBUCKET_WORKSPACE;
  }

  async request<T = unknown>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      method,
      headers: {
        Authorization:  `Basic ${this.auth}`,
        "Content-Type": "application/json",
        Accept:         "application/json",
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    const text = await res.text();

    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const parsed = JSON.parse(text) as { error?: { message?: string } };
        if (parsed?.error?.message) message += `: ${parsed.error.message}`;
        else message += `: ${text.slice(0, 200)}`;
      } catch {
        message += `: ${text.slice(0, 200)}`;
      }
      throw new Error(message);
    }

    return (text ? JSON.parse(text) : {}) as T;
  }

  get<T = unknown>(path: string)                    { return this.request<T>("GET",    path);        }
  post<T = unknown>(path: string, body?: unknown)   { return this.request<T>("POST",   path, body);  }
  put<T = unknown>(path: string, body?: unknown)    { return this.request<T>("PUT",    path, body);  }
  delete<T = unknown>(path: string)                 { return this.request<T>("DELETE", path);        }

  /** Raw fetch for endpoints that return non-JSON (e.g. diffs) */
  async rawText(path: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Basic ${this.auth}`, Accept: "text/plain" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }
}
