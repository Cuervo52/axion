import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import * as fs from 'fs';

async function listModels() {
    const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        apiVersion: 'v1beta'
    });
    try {
        const models = await ai.models.list();
        let modelList = 'Available models:\n';
        for await (const model of models) {
            modelList += `- ${model.name}\n`;
        }
        fs.writeFileSync('models_list.txt', modelList);
        console.log('Models written to models_list.txt');
    } catch (e) {
        fs.writeFileSync('models_list_error.txt', e.message);
        console.error('Failed to list models:', e.message);
    }
}

listModels();
