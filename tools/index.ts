import type { BitbucketClient } from "../client.js";
import { repositoryTools }  from "./repositories.js";
import { pullRequestTools } from "./pullrequests.js";
import { branchTools }      from "./branches.js";

export function buildTools(client: BitbucketClient) {
  return {
    ...repositoryTools(client),
    ...pullRequestTools(client),
    ...branchTools(client),
  };
}

export type ToolMap = ReturnType<typeof buildTools>;
export type ToolName = keyof ToolMap;
