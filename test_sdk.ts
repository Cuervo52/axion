import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
console.log('Methods on genAI:', Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)));
console.log('genAI keys:', Object.keys(genAI));

try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log('Model methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(model)));
} catch (e) {
    console.error('getGenerativeModel failed:', e.message);
}
