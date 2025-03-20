import "dotenv/config";
import { Issue } from "./issue";
import * as core from "@actions/core";
import * as github from "@actions/github";

const { context } = github;

async function run() {
  if (context.eventName !== "issues" || context.payload.action !== "opened") {
    core.error("This action only runs on newly opened issues.");
    return;
  }

  const issue = new Issue(context);
  await issue.handlePayload();
}

try {
  run();
} catch (error) {
  if (error instanceof Error) {
    core.setFailed(error.message);
  } else {
    core.setFailed("An unknown error occurred");
  }
}
