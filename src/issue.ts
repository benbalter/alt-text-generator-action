import * as github from "@actions/github";
import { WebhookPayload } from "@actions/github/lib/interfaces";
import * as core from "@actions/core";
import { generateAltText } from "./openai";
import { Context } from "@actions/github/lib/context";
import imageType from "image-type";

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
      return [];
    }

    const matches = imageRegex.exec(body);
    if (!matches) {
      return [];
    }

    return matches.map((match) => {
      const url = match[1];
      const altText = match[2];
      return { url, altText };
    });
  }

  async imageBase64(url: string) {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = <Buffer>arrayBuffer;
    const type = await imageType(buffer);
    const base64 = buffer.toString("base64");

    if (!type) {
      core.error(`Could not determine image type of ${url}`);
      return;
    }

    return `data:${type.mime};base64,${base64}`;
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
    if (images.length === 0) {
      core.info("No images found in the issue body.");
      return;
    }

    if (!this.data || !this.data.body) {
      core.setFailed("No issue data found.");
      return;
    }

    for (const image of images) {
      core.info(`Processing image: ${image.url}`);
      const base64data = await this.imageBase64(image.url);

      if (!base64data) {
        continue;
      }

      const altText = await generateAltText(base64data);

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
