import { NextRequest, NextResponse } from "next/server";
import { flashModel } from "@/lib/gemini/client";
import { SYSTEM_PROMPT } from "@/lib/ai/prompts";

export async function POST(req: NextRequest) {
    try {
        const { topics } = await req.json();

        if (!topics || topics.length === 0) {
            return NextResponse.json({ summary: "You've made great progress today!" });
        }

        const prompt = `
        The user has just finished a learning session where they covered the following topics:
        ${topics.join(", ")}

        You must return ONLY a strictly valid JSON object with exactly two keys: "summary" and "flowchart". Do not include markdown codeblocks like \`\`\`json.
        
        1. "summary": A very short (2-3 sentences), engaging, cohesive "learning flow" recap explaining how these topics connect.
        2. "flowchart": A valid Mermaid.js flowchart (graph TD) syntax string mapping the sequence or relationship of the topics. Use simple A --> B syntax. Only use standard alphanumeric labels. Do not use complex mermaid styling.
        `;

        const combinedPrompt = `${SYSTEM_PROMPT}\n\nTask:\n${prompt}`;

        const result = await flashModel.generateContent(combinedPrompt);
        const responseText = result.response.text().trim().replace(/^```json\s*/, '').replace(/```$/, '').trim();

        try {
            const parsedData = JSON.parse(responseText);
            return NextResponse.json(parsedData);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            return NextResponse.json({
                summary: responseText,
                flowchart: "graph TD\nError --> CouldNotGenerate"
            });
        }

    } catch (error: unknown) {
        console.error("Error in summarize-session API:", error);
        return NextResponse.json(
            { error: "Internal server error during session summarization" },
            { status: 500 }
        );
    }
}
