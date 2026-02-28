import { NextRequest, NextResponse } from "next/server";
import { flashModel } from "@/lib/gemini/client";
import { db } from "@/lib/firebase/config";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export async function POST(req: NextRequest) {
    console.log(">>> [API] Starting timetable analysis...");
    try {
        const formData = await req.formData();
        const userId = formData.get("userId") as string;
        const file = formData.get("file") as File;

        if (!userId || !file) {
            console.error(">>> [API] Error: Missing userId or file");
            return NextResponse.json({ error: "Missing userId or file" }, { status: 400 });
        }

        console.log(`>>> [API] Processing file: ${file.name}, size: ${file.size} bytes`);

        // 1. Convert file to base64 for Gemini
        const buffer = Buffer.from(await file.arrayBuffer());
        const base64Data = buffer.toString("base64");
        const fileType = file.type || "application/pdf";

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

        console.log(">>> [API] Calling Gemini...");
        // 3. Call Gemini Flash
        const result = await flashModel.generateContent([
            prompt,
            {
                inlineData: {
                    data: base64Data,
                    mimeType: fileType
                }
            }
        ]);

        const responseText = result.response.text();
        console.log(">>> [API] Gemini response received.");

        // Clean up response text if it's wrapped in triple backticks
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error(">>> [API] Invalid JSON from Gemini:", responseText);
            throw new Error("Gemini failed to generate valid JSON");
        }

        const scheduleData = JSON.parse(jsonMatch[0]);
        const schedule = scheduleData.items || [];

        // 4. Save to Firestore
        console.log(">>> [API] Saving to Firestore...");
        const scheduleRef = doc(db, `users/${userId}/metadata`, "schedule");
        await setDoc(scheduleRef, {
            items: schedule,
            lastAnalyzed: serverTimestamp(),
            fileName: file.name
        });

        console.log(">>> [API] Success!");
        return NextResponse.json({ success: true, schedule });

    } catch (error: any) {
        console.error(">>> [API] Timetable Analysis Error:", error);
        const errorResponse = {
            error: "[V112_API_FAILURE]",
            message: String(error.message || "Unknown Error"),
            details: String(error),
            active_model: "gemini-2.0-flash-lite",
            debug_sync: "v1.1.2-active",
            timestamp: new Date().toISOString()
        };
        return new Response(JSON.stringify(errorResponse), {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Cache-Control': 'no-store'
            }
        });
    }
}
