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

        Please generate a very short (2-3 sentences), engaging, and cohesive "learning flow" recap. 
        It should explain how these topics connect or summarize the general theme of their session. 
        Use an encouraging and academic yet modern tone (like a friendly micro-learning app).
        Avoid generic "Good job" phrases. Focus on the actual content relationships.
        `;

        const combinedPrompt = `${SYSTEM_PROMPT}\n\nTask:\n${prompt}`;

        const result = await flashModel.generateContent(combinedPrompt);
        const responseText = result.response.text();

        return NextResponse.json({
            summary: responseText.trim().replace(/^"|"$/g, '')
        });

    } catch (error: unknown) {
        console.error("Error in summarize-session API:", error);
        return NextResponse.json(
            { error: "Internal server error during session summarization" },
            { status: 500 }
        );
    }
}
