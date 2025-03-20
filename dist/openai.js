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
const systemPrompt = `You are an AI that generates alt text for images referenced in GitHub Issues. 
You will be given a base64 encoded image and you will generate a detailed description of the image. 
The description should be in English and should be suitable for visually impaired users. 
The description should be at least 50 words long and should include details about the content of the image, the colors, the emotions, and any other relevant information.
`;
const token = core.getInput("GITHUB_TOKEN", { required: true });
const client = new openai_1.default({
    baseURL: "https://models.inference.ai.azure.com",
    apiKey: token,
});
async function generateAltText(base64data) {
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
                            details: "high",
                        },
                    },
                ],
            },
        ],
        model: "gpt-4o",
    });
    return response.choices[0].message.content;
}
