import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
    console.warn("GEMINI_API_KEY is not defined in the environment variables.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const FLASH_MODEL_NAME = "gemini-2.0-flash-lite";
export const model = genAI.getGenerativeModel({ model: FLASH_MODEL_NAME });
export const flashModel = genAI.getGenerativeModel({ model: FLASH_MODEL_NAME });
export const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" }) // Try standard embedding-001 if this fails, but wait, let's just use embedding-001 to be completely safe and avoid 404s.

// Update: Using embedding-001 instead to fix the 404 error
export const embeddingModelSafe = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

export default genAI;
