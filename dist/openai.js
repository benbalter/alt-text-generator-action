"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAltText = generateAltText;
const openai_1 = __importDefault(require("openai"));
const core = __importStar(require("@actions/core"));
const image_type_1 = __importDefault(require("image-type"));
const systemPrompt = `You are an AI that generates alt text for images referenced in GitHub Issues. 
You will be given a base64 encoded image, along with JSON-formatted issue metadata and you will generate a detailed description of the image. 
The description should be in English and should be suitable for visually impaired users. 
The description should be around 150 characters long and should include details about the content of the image, the colors, the emotions, and any other relevant information.
Reply only with the alt text.
`;
const token = core.getInput("GITHUB_TOKEN", { required: true });
const client = new openai_1.default({
    baseURL: "https://models.github.ai",
    apiKey: token,
});
async function imageBase64(url) {
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
    const type = await (0, image_type_1.default)(buffer);
    if (!type) {
        core.error(`Could not determine image type of ${url}`);
        return;
    }
    const base64 = buffer.toString("base64");
    return `data:${type.mime};base64,${base64}`;
}
async function generateAltText(url, issue) {
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
                content: `Please generate alt text for the image at ${url}`,
            },
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
    const altText = response.choices[0].message.content;
    core.info(`Generated alt text: ${altText}`);
    return altText;
}
