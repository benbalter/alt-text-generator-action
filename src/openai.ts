import OpenAI from "openai";
import * as core from "@actions/core";

const systemPrompt = `You are an AI that generates alt text for images referenced in GitHub Issues. 
You will be given a base64 encoded image and you will generate a detailed description of the image. 
The description should be in English and should be suitable for visually impaired users. 
The description should be at least 50 words long and should include details about the content of the image, the colors, the emotions, and any other relevant information.
`;

const token = core.getInput("GITHUB_TOKEN", { required: true });

const client = new OpenAI({
  baseURL: "https://models.inference.ai.azure.com",
  apiKey: token,
});

export async function generateAltText(base64data: string) {
  const response = await client.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
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
    model: "gpt-4o",
  });

  return response.choices[0].message.content;
}
