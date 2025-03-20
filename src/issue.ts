import * as github from "@actions/github";
import { WebhookPayload } from "@actions/github/lib/interfaces";
import * as core from "@actions/core";
import { generateAltText } from "./openai";
import { Context } from "@actions/github/lib/context";

export const token = core.getInput("GITHUB_TOKEN", { required: true });
export const octokit = github.getOctokit(token);
const imageRegex = /!\[(.*?)\]\((.*?)\)/g;

export class Issue {
  data: WebhookPayload["issue"];
  repo: Context["repo"];

  constructor(context: Context) {
    this.data = context.payload.issue;
    this.repo = context.repo;
  }

  getImages() {
    const body = this.data?.body;
    if (!body) {
      core.error("Could not get issue body.");
      return [];
    }

    const matches = body.matchAll(imageRegex);
    if (!matches) {
      core.info("No images in issue body.");
      return [];
    }

    core.debug(`Matches: ${JSON.stringify(matches)}`);

    const images = Array.from(matches).map((match) => {
      core.debug(`Match: ${JSON.stringify(match)}`);
      const altText = match[1];
      const url = match[2];
      return { url, altText };
    });

    core.debug(`Found images: ${JSON.stringify(images)}`);

    return images;
  }

  async updateBody() {
    if (!this.data || !this.data.body) {
      core.setFailed("No issue data found.");
      return;
    }

    core.info("Updating issue body...");

    octokit.rest.issues.update({
      ...this.repo,
      issue_number: this.data.number,
      body: this.data.body,
    });
  }

  async insertAltText() {
    const images = this.getImages();

    if (!this.data || !this.data.body) {
      core.setFailed("No issue data found.");
      return;
    }

    for (const image of images) {
      core.info(`Processing image: ${image.url}`);
      const altText = await generateAltText(image.url, this.data);

      if (!altText) {
        core.error("No alt text generated.");
        continue;
      }

      this.data.body = this.data.body.replace(
        `![${image.altText}](${image.url})`,
        `![${altText}](${image.url})`,
      );
    }
  }

  async handlePayload() {
    core.info("Handling issue payload...");
    await this.insertAltText();
    await this.updateBody();
  }
}
