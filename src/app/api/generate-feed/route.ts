import { NextRequest, NextResponse } from "next/server";
import { getPineconeIndex } from "@/lib/pinecone/client";
import { embeddingModelSafe, flashModel } from "@/lib/gemini/client";
import { SYSTEM_PROMPT, getGenerateFeedPrompt } from "@/lib/ai/prompts";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp, query, where, orderBy, limit, getDocs, doc, getDoc } from "firebase/firestore";

export async function POST(req: NextRequest) {
    try {
        const { userId, subject, expertiseLevel = "intermediate" } = await req.json();

        if (!userId) {
            return NextResponse.json({ error: "Missing userId" }, { status: 400 });
        }

        // 1. Generate query embedding for the subject
        // E.g., if subject is "Biology", we search for chunks related to Biology
        const queryTerm = subject || "general knowledge";
        const embeddingResult = await embeddingModelSafe.embedContent({
            content: { role: "user", parts: [{ text: queryTerm }] },
            outputDimensionality: 768
        } as any);
        const queryEmbedding = embeddingResult.embedding.values;

        // 2. Query Pinecone for relevant chunks and past generated summaries
        const index = getPineconeIndex();
        const queryResponse = await index.query({
            vector: queryEmbedding,
            filter: {
                userId: { $eq: userId }
            },
            topK: 15, // Get top 15 matches (mix of doc chunks and past summaries)
            includeMetadata: true
        });

        // 3. Construct context from retrieved chunks and extract past summaries
        const matches = queryResponse.matches || [];

        const documentChunks = matches.filter(m => m.metadata?.type !== 'generated_summary');
        const pastSummaryMatches = matches.filter(m => m.metadata?.type === 'generated_summary');

        let context = "";
        if (documentChunks.length > 0) {
            context = documentChunks.map(match => match.metadata?.text || "").join("\n---\n");
        } else {
            // Fallback context if user has no documents
            context = `The user is studying ${queryTerm}. Please generate introductory general knowledge content about this topic since they haven't uploaded specific materials yet.`;
        }

        const pineconePreviousTopics = pastSummaryMatches.map(m => m.metadata?.text as string).filter(Boolean);

        // 3.5 Query Firestore for recently generated topics to prevent duplication
        const feedsRef = collection(db, "feeds");
        let recentQuery;
        if (subject) {
            recentQuery = query(feedsRef, where("subject", "==", subject), orderBy("createdAt", "desc"), limit(20));
        } else {
            recentQuery = query(feedsRef, orderBy("createdAt", "desc"), limit(20));
        }

        const recentDocs = await getDocs(recentQuery);
        const firestorePreviousTopics = recentDocs.docs.map(doc => doc.data().topic).filter(Boolean);

        // Combine Pinecone past summaries and Firestore previous topics
        const allPreviousTopics = [...new Set([...pineconePreviousTopics, ...firestorePreviousTopics])];

        // 4. Generate Content with Gemini Flash (faster for generated feeds)
        const prompt = getGenerateFeedPrompt(context, expertiseLevel, allPreviousTopics);

        // Prepend system prompt to user prompt to avoid SDK type mismatches with systemInstruction
        const combinedPrompt = `${SYSTEM_PROMPT}\n\nTask:\n${prompt}`;

        const chatSession = flashModel.startChat({
            generationConfig: {
                temperature: 0.7,
                responseMimeType: "application/json",
            }
        });

        const result = await chatSession.sendMessage(combinedPrompt);
        const responseText = result.response.text();

        try {
            const feedData = JSON.parse(responseText);
            const items = feedData.items || [];

            // Fetch user's display name to store with the feed items
            const userDoc = await getDoc(doc(db, "users", userId));
            const authorName = userDoc.exists() ? (userDoc.data().displayName || "Learner") : "Learner";

            // Save items to Firestore async
            if (items.length > 0) {
                const feedsRef = collection(db, "feeds");

                // Fire and forget or await Promise.all
                await Promise.all(items.map(async (item: Record<string, unknown>) => {
                    // Remove the Gemini-generated ID off the item so we don't store it
                    // and instead uniquely rely on the Firestore auto-generated document ID later.
                    const { id: _ignoredId, ...itemData } = item;

                    await addDoc(feedsRef, {
                        ...itemData,
                        subject: subject || "general knowledge", // Tag the subject so we can filter later
                        createdAt: serverTimestamp(),
                        generatedBy: userId,
                        authorId: userId,
                        authorName: authorName,
                        upvotes: 0,
                        downvotes: 0,
                        votedBy: {},
                        comments: 0,
                    });
                }));

                // 5. Upsert newly generated feed summary to Pinecone
                const generatedTopics = items.map((i: any) => i.topic).join(", ");
                const summaryText = `Generated feed about ${subject || 'general knowledge'} for ${expertiseLevel} student. Topics covered: ${generatedTopics}`;

                try {
                    const embedResult = await embeddingModelSafe.embedContent({
                        content: { role: "user", parts: [{ text: summaryText }] },
                        outputDimensionality: 768
                    } as any);
                    const newEmbedding = embedResult.embedding.values;

                    await index.upsert({
                        records: [{
                            id: `summary-${userId}-${Date.now()}`,
                            values: newEmbedding,
                            metadata: {
                                userId,
                                subject: subject || 'general knowledge',
                                type: 'generated_summary',
                                text: summaryText,
                                timestamp: Date.now()
                            }
                        }]
                    });
                    console.log(`[GENERATE_FEED] Upserted summary to Pinecone for ${subject}: ${summaryText}`);
                } catch (pineconeErr) {
                    console.error("[GENERATE_FEED] Failed to upsert summary to Pinecone:", pineconeErr);
                }
            }

            return NextResponse.json({ success: true, count: items.length });
        } catch (error: unknown) {
            console.error("Failed to parse Gemini JSON:", responseText);
            return NextResponse.json({ error: "Invalid content generated" }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error("Error generating feed:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: "Internal server error during feed generation", details: errorMessage },
            { status: 500 }
        );
    }
}
