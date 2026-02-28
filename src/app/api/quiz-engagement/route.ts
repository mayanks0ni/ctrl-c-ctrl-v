import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const { userId, feedId, topic, isCorrect } = await req.json();

        if (!userId || !feedId || !topic) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);

        if (!userDoc.exists()) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const updates: any = {};

        if (isCorrect) {
            // 1. Correct Answer: Scaling Difficulty
            const currentExpertise = userData.topicExpertise?.[topic] || "beginner";
            let newExpertise = currentExpertise;

            if (currentExpertise === "beginner") newExpertise = "intermediate";
            else if (currentExpertise === "intermediate") newExpertise = "advanced";

            updates[`topicExpertise.${topic}`] = newExpertise;

            // Remove from retries if it was there
            updates.retryQuizzes = arrayRemove(feedId);
        } else {
            // 2. Wrong Answer: Spaced Repetition preparation
            // Add to retries
            updates.retryQuizzes = arrayUnion(feedId);

            // Remove from viewedReels so it can be injected again by the scroller
            updates.viewedReels = arrayRemove(feedId);
        }

        await updateDoc(userRef, updates);

        return NextResponse.json({
            success: true,
            expertise: isCorrect ? updates[`topicExpertise.${topic}`] : userData.topicExpertise?.[topic] || "beginner"
        });

    } catch (error: unknown) {
        console.error("Error in quiz engagement:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
