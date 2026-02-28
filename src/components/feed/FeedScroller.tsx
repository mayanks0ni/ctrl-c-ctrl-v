"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FeedItemType, PostCard, SummaryCard, VisualCard, QuizCard } from "./FeedCards";
import FocusInterrupter from "./FocusInterrupter";
import { Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot, where, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useInteractionTracker } from "@/hooks/useInteractionTracker";

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
    const [hijackedSubject, setHijackedSubject] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Dynamic subject selection based on intervention or props
    const activeSubject = hijackedSubject || subject;

    // 2. Function to trigger background generation
    const triggerGeneration = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            // Pick a defined subject for generation. If "For You" (undefined subject) is active,
            // pick a random subject from the user's list. If they have none, fallback to "general knowledge".
            let generateSubject = activeSubject;
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
    }, [isGenerating, activeSubject, difficulty, userSubjects, userId]);

    // Reset feed items when the active subject changes
    useEffect(() => {
        setItems([]);
        setLoading(true);
    }, [activeSubject]);

    // 1. Subscribe to Firestore for user's viewed reels and feed items
    useEffect(() => {
        if (!userId) return;

        // Listen for the user's viewedReels
        let viewedReels: string[] = [];
        const userUnsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                viewedReels = docSnap.data()?.viewedReels || [];
            }
        });

        let q = query(
            collection(db, "feeds"),
            orderBy("createdAt", "desc") // Fetch latest
        );

        if (activeSubject) {
            q = query(
                collection(db, "feeds"),
                where("subject", "==", activeSubject),
                orderBy("createdAt", "desc")
            );
        }

        const feedsUnsubscribe = onSnapshot(q, (snapshot) => {
            const feedItems: FeedItemType[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                // We only include items NOT in viewedReels to avoid repetition
                if (data.type && !viewedReels.includes(doc.id)) {
                    feedItems.push({ ...data, id: doc.id } as FeedItemType);
                }
            });

            // 1. Separate feed items into Quizzes and General Content
            const quizzes: FeedItemType[] = [];
            const general: FeedItemType[] = [];

            feedItems.forEach(item => {
                if (item.type === "quiz") quizzes.push(item);
                else general.push(item);
            });

            // 2. Fisher-Yates shuffle both independently
            const shuffleArray = (arr: FeedItemType[]) => {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            };
            shuffleArray(quizzes);
            shuffleArray(general);

            setItems(prevItems => {
                // Determine valid active prev items 
                const updatedPrevItems = prevItems.map(p => feedItems.find(f => f.id === p.id) || p).filter(p => !viewedReels.includes(p.id));

                // 3. Count how many general items we have consecutively at the tail of our existing feed stack
                let nonQuizCountAtEnd = 0;
                for (let i = updatedPrevItems.length - 1; i >= 0; i--) {
                    if (updatedPrevItems[i].type !== "quiz") {
                        nonQuizCountAtEnd++;
                    } else {
                        break;
                    }
                }

                // Filter out new items we already have in our list
                const availableGeneral = general.filter(item => !prevItems.some(p => p.id === item.id));
                const availableQuizzes = quizzes.filter(item => !prevItems.some(p => p.id === item.id));

                const newItems: FeedItemType[] = [];

                // 4. Inject items with spacing logic rules
                while (availableGeneral.length > 0 || availableQuizzes.length > 0) {
                    // Random target gap between 8 and 10
                    const targetGap = Math.floor(Math.random() * 3) + 8; // Random 8, 9, or 10

                    if (availableQuizzes.length > 0 && nonQuizCountAtEnd >= targetGap) {
                        // Inject a quiz
                        newItems.push(availableQuizzes.pop()!);
                        nonQuizCountAtEnd = 0; // Reset counter after injecting quiz
                    } else if (availableGeneral.length > 0) {
                        // Inject general content
                        newItems.push(availableGeneral.pop()!);
                        nonQuizCountAtEnd++;
                    } else {
                        // No general content available, and we haven't hit the target gap for a quiz
                        // We must stop adding new items and abandon the remaining quizzes until more general content generates
                        break;
                    }
                }

                return [...updatedPrevItems, ...newItems];
            });
            setLoading(false);

            // Initial generation if completely empty and not already generating
            if (feedItems.length === 0 && !isGenerating) {
                triggerGeneration();
            }
        });

        return () => {
            userUnsubscribe();
            feedsUnsubscribe();
        };
    }, [userId, activeSubject, isGenerating, triggerGeneration]);

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
    }, [loading, isGenerating, triggerGeneration]);

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
            className="h-[100dvh] w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar bg-black relative"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
            <style jsx global>{`.no-scrollbar::-webkit-scrollbar { display: none; }`}</style>

            {/* The active school-class intervention */}
            <FocusInterrupter
                userId={userId}
                onIntervention={(hijackedSubject) => {
                    setHijackedSubject(hijackedSubject);
                    if (!isGenerating) triggerGeneration(); // Immediately trigger background generation for the hijacked class subject
                }}
            />

            {items.map((item, index) => {
                const isTriggerElement = items.length > 5 && index === Math.floor(items.length * 0.75);
                return (
                    <FeedItemWrapper
                        key={`${item.id}-${index}`}
                        item={item}
                        userId={userId}
                        isTriggerElement={isTriggerElement}
                        lastItemRef={lastItemRef}
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

function FeedItemWrapper({ item, userId, isTriggerElement, lastItemRef }: { item: FeedItemType, userId: string, isTriggerElement: boolean, lastItemRef: (node: HTMLDivElement) => void }) {
    const cardRef = useRef<HTMLDivElement>(null);
    const { startView, endView } = useInteractionTracker(userId);
    const viewTracked = useRef(false);
    const startTimeRef = useRef<number | null>(null);

    useEffect(() => {
        const node = cardRef.current;
        if (!node) return;

        let hasLoggedView = false;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Start local Edu Wrapped tracking
                    startView(item.id);
                    startTimeRef.current = Date.now();
                    viewTracked.current = true;

                    // Call remote engagement API for 'viewed' (updates viewedReels)
                    if (!hasLoggedView) {
                        hasLoggedView = true;
                        fetch("/api/track-engagement", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, feedId: item.id, topic: item.topic, engagementType: "viewed" }),
                            keepalive: true
                        }).catch(e => console.error("Error sending viewed engagement:", e));
                    }
                } else if (viewTracked.current) {
                    // End local Edu Wrapped tracking
                    endView(item.id, (item as any).subject);
                    viewTracked.current = false;

                    // Handle 'avoided' tracking for remote API if duration is short
                    if (startTimeRef.current) {
                        const durationMs = Date.now() - startTimeRef.current;
                        startTimeRef.current = null;

                        if (durationMs < 2500) {
                            fetch("/api/track-engagement", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId, feedId: item.id, topic: item.topic, engagementType: "avoided", durationMs }),
                                keepalive: true
                            }).catch(e => console.error("Error sending avoided engagement:", e));
                        }
                    }
                }
            });
        }, { threshold: 0.6 });

        observer.observe(node);
        return () => observer.disconnect();
    }, [item.id, item.topic, userId, startView, endView]);

    return (
        <div
            ref={(node) => {
                // Combine refs
                (cardRef as any).current = node;
                if (isTriggerElement && node) lastItemRef(node);
            }}
            className="h-[100dvh] w-full snap-start relative flex-shrink-0 bg-black"
        >
            {item.type === "post" && <PostCard item={item} userId={userId} />}
            {item.type === "summary" && <SummaryCard item={item} userId={userId} />}
            {item.type === "visual_concept" && <VisualCard item={item} userId={userId} />}
            {item.type === "quiz" && <QuizCard item={item} userId={userId} />}
        </div>
    );
}

