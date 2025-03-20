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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Issue = exports.octokit = exports.token = void 0;
const github = __importStar(require("@actions/github"));
const core = __importStar(require("@actions/core"));
const openai_1 = require("./openai");
exports.token = core.getInput("GITHUB_TOKEN", { required: true });
exports.octokit = github.getOctokit(exports.token);
const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
class Issue {
    constructor(context) {
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
    async imageBase64(url) {
        const buffer = await fetch(url);
        const base64 = buffer.toString("base64");
        const imageFormat = url.split(".").pop();
        return `data:image/${imageFormat};base64,${base64}`;
    }
    async updateBody() {
        if (!this.data || !this.data.body) {
            core.setFailed("No issue data found.");
            return;
        }
        core.info("Updating issue body...");
        exports.octokit.rest.issues.update({
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
            const altText = await (0, openai_1.generateAltText)(base64data);
            if (!altText) {
                core.error("No alt text generated.");
                continue;
            }
            this.data.body = this.data.body.replace(`![${image.altText}](${image.url})`, `![${altText}](${image.url})`);
        }
    }
    async handlePayload() {
        core.info("Handling issue payload...");
        await this.insertAltText();
        await this.updateBody();
    }
}
exports.Issue = Issue;
