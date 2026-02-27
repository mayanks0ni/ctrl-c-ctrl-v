import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
  console.log("Fetching models...");
  try {
    const models = await genAI.getModel("models/text-embedding-004");
    console.log("Model found:", models);
  } catch (e) {
    console.log("Error:", e.message);
  }
}

run();
