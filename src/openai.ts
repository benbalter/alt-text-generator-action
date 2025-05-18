import OpenAI from "openai";
import * as core from "@actions/core";
import imageType from "image-type";
import { WebhookPayload } from "@actions/github/lib/interfaces";

const systemPrompt = `You are an AI that generates alt text for images referenced in GitHub Issues. 
You will be given a base64 encoded image, along with JSON-formatted issue metadata and you will generate a detailed description of the image. 
The description should be in English and should be suitable for visually impaired users. 
The description should be around 150 characters long and should include details about the content of the image, the colors, the emotions, and any other relevant information.
Reply only with the alt text.
`;

const token = core.getInput("GITHUB_TOKEN", { required: true });

const client = new OpenAI({
  baseURL: "https://models.github.ai",
  apiKey: token,
});

async function imageBase64(url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    core.error(`Failed to fetch image from ${url}. Status: ${response.status}`);
    return;
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  if (buffer.length === 0) {
    core.error(`Fetched data from ${url} is empty.`);
    return;
  }

  const type = await imageType(buffer);

  if (!type) {
    core.error(`Could not determine image type of ${url}`);
    return;
  }

  const base64 = buffer.toString("base64");
  return `data:${type.mime};base64,${base64}`;
}

export async function generateAltText(
  url: string,
  issue: WebhookPayload["issue"],
) {
  const base64data = await imageBase64(url);

  if (!base64data) {
    core.error(`Failed to convert image at ${url} to base64.`);
    return;
  }

  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: JSON.stringify(issue) },
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: base64data,
              detail: "high",
            },
          },
        ],
      },
    ],
    model: "openai/gpt-4.1",
  });

  const altText = response.choices[0].message.content;
  core.info(`Generated alt text: ${altText}`);
  return altText;
}
