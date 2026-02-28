"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FeedItemType, PostCard, SummaryCard, VisualCard, QuizCard } from "./FeedCards";
import { Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface FeedScrollerProps {
    userId: string;
    subject?: string;
    difficulty?: string;
    userSubjects?: { name: string, difficulty: string }[];
}

export default function FeedScroller({ userId, subject, difficulty, userSubjects = [] }: FeedScrollerProps) {
    const [items, setItems] = useState<FeedItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // 1. Subscribe to Firestore for feed items
    useEffect(() => {
        if (!userId) return;

        let q = query(
            collection(db, "feeds"),
            orderBy("createdAt", "desc") // Show newest first or oldest first depending on preference
        );

        if (subject) {
            q = query(
                collection(db, "feeds"),
                where("subject", "==", subject),
                orderBy("createdAt", "desc")
            );
        } else {
            // General feed
            q = query(
                collection(db, "feeds"),
                orderBy("createdAt", "desc")
            );
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const feedItems: FeedItemType[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // Ensure type mapping matches FeedItemType
                if (data.type) {
                    feedItems.push({ ...data, id: doc.id } as FeedItemType);
                }
            });

            setItems(feedItems);
            setLoading(false);

            // Initial generation if completely empty and not already generating
            if (feedItems.length === 0 && !isGenerating) {
                triggerGeneration();
            }
        });

        return () => unsubscribe();
    }, [userId, subject]);

    // 2. Function to trigger background generation
    const triggerGeneration = async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            // Pick a defined subject for generation. If "For You" (undefined subject) is active,
            // pick a random subject from the user's list. If they have none, fallback to "general knowledge".
            let generateSubject = subject;
            let generateDifficulty = difficulty;

            if (!generateSubject) {
                if (userSubjects.length > 0) {
                    const randomSubject = userSubjects[Math.floor(Math.random() * userSubjects.length)];
                    generateSubject = randomSubject.name;
                    generateDifficulty = randomSubject.difficulty;
                } else {
                    generateSubject = "general knowledge";
                    generateDifficulty = "beginner";
                }
            }

            await fetch("/api/generate-feed", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, subject: generateSubject, expertiseLevel: generateDifficulty || "beginner" }),
            });
            // The API will save to Firestore, which will trigger the onSnapshot above!
        } catch (error) {
            console.error("Failed to generate feed", error);
        } finally {
            setIsGenerating(false);
        }
    };

    // 3. Track scroll position to trigger infinite generation
    const lastItemRef = useCallback((node: HTMLDivElement) => {
        if (loading || isGenerating) return;
        if (observerRef.current) observerRef.current.disconnect();

        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                // When the "load more" trigger element comes into view, generate more
                triggerGeneration();
            }
        });

        if (node) observerRef.current.observe(node);
    }, [loading, isGenerating, userId, subject, difficulty]);

    if (loading) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-black">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                    <p className="text-zinc-500 font-medium animate-pulse">Curating your knowledge feed...</p>
                </div>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-black text-white text-center p-6">
                <div>
                    <h2 className="text-2xl font-bold mb-4">You&apos;re all caught up!</h2>
                    <p className="text-zinc-400">Upload more materials to generate new content.</p>
                </div>
            </div>
        );
    }

    return (
        <div
            ref={scrollRef}
            className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar bg-black"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

            {items.map((item, index) => {
                const isTriggerElement = items.length > 5 && index === Math.floor(items.length * 0.75);
                return (
                    <FeedItemContainer
                        key={`${item.id}-${index}`}
                        item={item}
                        userId={userId}
                        forwardRef={isTriggerElement ? lastItemRef : null}
                    />
                );
            })}

            {isGenerating && (
                <div className="h-[20dvh] w-full flex items-center justify-center bg-black snap-start">
                    <div className="flex flex-col items-center">
                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
                        <span className="text-zinc-500">Curating more content...</span>
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Inner Component to track individual reel engagement ---
const FeedItemContainer = ({ item, userId, forwardRef }: { item: FeedItemType, userId: string, forwardRef: React.Ref<HTMLDivElement> | ((instance: HTMLDivElement | null) => void) | null }) => {
    const itemRef = useRef<HTMLDivElement>(null);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const node = itemRef.current;
        if (!node) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    startTimeRef.current = Date.now();
                } else if (startTimeRef.current) {
                    const durationMs = Date.now() - startTimeRef.current;
                    startTimeRef.current = null;

                    if (durationMs < 2500) {
                        try {
                            fetch("/api/track-engagement", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId, topic: item.topic, engagementType: "avoided", durationMs }),
                                keepalive: true
                            }).catch(e => console.error("Error sending engagement:", e));
                        } catch (e) {
                            console.error("Engagement tracking error:", e);
                        }
                    }
                }
            });
        }, { threshold: 0.6 });

        observer.observe(node);
        return () => observer.disconnect();
    }, [item.topic, userId]);

    const setRefs = useCallback(
        (node: HTMLDivElement | null) => {
            itemRef.current = node;
            if (typeof forwardRef === 'function') {
                forwardRef(node);
            } else if (forwardRef && 'current' in forwardRef) {
                (forwardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
            }
        },
        [forwardRef]
    );

    return (
        <div ref={setRefs} className="h-[100dvh] w-full snap-start relative flex-shrink-0 bg-black">
            {item.type === "post" && <PostCard item={item} userId={userId} />}
            {item.type === "summary" && <SummaryCard item={item} userId={userId} />}
            {item.type === "visual_concept" && <VisualCard item={item} userId={userId} />}
            {item.type === "quiz" && <QuizCard item={item} userId={userId} />}
        </div>
    );
};
