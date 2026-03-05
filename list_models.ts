import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

async function listModels() {
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        apiVersion: 'v1'
    });
    try {
        const models = await ai.models.list();
        console.log('Available models:');
        for await (const model of models) {
            console.log(`- ${model.name}`);
        }
    } catch (e) {
        console.error('Failed to list models:', e.message);
    }
}

listModels();
