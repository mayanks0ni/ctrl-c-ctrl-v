import { NextRequest, NextResponse } from "next/server";
import { getPineconeIndex } from "@/lib/pinecone/client";
import { embeddingModelSafe } from "@/lib/gemini/client";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

export async function POST(req: NextRequest) {
    try {
        const { userId, topic, engagementType, durationMs, feedId } = await req.json();

        if (!userId || !topic || !engagementType) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        if (engagementType === "avoided") {
            // Embed the skipped topic so it can be retrieved by similarities to other contexts
            const embedResult = await embeddingModelSafe.embedContent({
                content: { role: "user", parts: [{ text: topic }] },
                outputDimensionality: 768
            } as any);
            const embedding = embedResult.embedding.values;

            const index = getPineconeIndex();

            await index.upsert({
                records: [{
                    id: `avoided-${userId}-${Date.now()}`,
                    values: embedding,
                    metadata: {
                        userId,
                        type: 'avoided_topic',
                        text: topic,
                        timestamp: Date.now(),
                        durationMs: durationMs || 0
                    }
                }]
            });

            console.log(`[TRACKING] Avoided topic logged for User ${userId}: ${topic}`);
            return NextResponse.json({ success: true, message: "Avoided topic recorded" });
        } else if (engagementType === "viewed") {
            if (!feedId) {
                return NextResponse.json({ error: "Missing feedId for viewed engagement" }, { status: 400 });
            }

            const { arrayUnion } = await import("firebase/firestore");
            const { setDoc } = await import("firebase/firestore");
            const userRef = doc(db, "users", userId);

            await setDoc(userRef, {
                viewedReels: arrayUnion(feedId)
            }, { merge: true }).catch(async (e) => {
                console.error("Failed to update viewedReels:", e);
                throw e;
            });
            return NextResponse.json({ success: true, message: "Viewed reel recorded" });
        }

        // Potential for future expansion: track highly 'engaged' topics
        return NextResponse.json({ success: true, message: "Engagement recorded" });

    } catch (error: unknown) {
        console.error("Error tracking engagement:", error);
        return NextResponse.json(
            { error: "Internal server error during engagement tracking" },
            { status: 500 }
        );
    }
}
