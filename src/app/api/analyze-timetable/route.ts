import { NextRequest, NextResponse } from "next/server";
import { flashModel } from "@/lib/gemini/client";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const { userId, fileUrl, fileType } = await req.json();

        if (!userId || !fileUrl) {
            return NextResponse.json({ error: "Missing userId or fileUrl" }, { status: 400 });
        }

        // 1. Fetch the file content as an array buffer
        const response = await fetch(fileUrl);
        const buffer = await response.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString("base64");

        // 2. Construct the prompt for Gemini
        const prompt = `
            Analyze this study timetable and extract the schedule into a structured JSON format.
            Return a JSON object with an "items" key containing an array of objects.
            Each object should have:
            - "subject": The name of the subject/class.
            - "day": The day of the week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday).
            - "startTime": The start time in 24-hour format (HH:mm).
            - "endTime": The end time in 24-hour format (HH:mm).

            If a class repeats on multiple days, create separate entries for each day.
            Only return the JSON object, nothing else.
        `;

        // 3. Call Gemini Flash
        const result = await flashModel.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: fileType || "image/jpeg"
                }
            }
        ]);

        const responseText = result.response.text();

        // Clean up response text if it's wrapped in triple backticks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            throw new Error("Gemini failed to generate valid JSON");
        }

        const scheduleData = JSON.parse(jsonMatch[0]);
        const schedule = scheduleData.items || [];

        // 4. Save to Firestore
        const scheduleRef = doc(db, `users/${userId}/metadata`, "schedule");
        await setDoc(scheduleRef, {
            items: schedule,
            lastAnalyzed: serverTimestamp(),
            sourceUrl: fileUrl
        });

        return NextResponse.json({ success: true, schedule });

    } catch (error: any) {
        console.error("Timetable Analysis Error:", error);
        return NextResponse.json({
            error: "Failed to analyze timetable",
            details: error.message
        }, { status: 500 });
    }
}
