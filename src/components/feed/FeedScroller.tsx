"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { FeedItemType, PostCard, SummaryCard, VisualCard, QuizCard } from "./FeedCards";
import FocusInterrupter from "./FocusInterrupter";
import { Loader2 } from "lucide-react";
import { collection, query, orderBy, onSnapshot, where, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useInteractionTracker } from "@/hooks/useInteractionTracker";
import SessionSummaryModal from "./SessionSummaryModal";
import { AnimatePresence } from "framer-motion";

interface FeedScrollerProps {
    userId: string;
    subject?: string;
    difficulty?: string;
    userSubjects?: { name: string, difficulty: string }[];
    quizOnly?: boolean;
}

export default function FeedScroller({ userId, subject, difficulty, userSubjects = [], quizOnly = false }: FeedScrollerProps) {
    const [items, setItems] = useState<FeedItemType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [hijackedSubject, setHijackedSubject] = useState<string | null>(null);
    const [viewedTopics, setViewedTopics] = useState<Set<string>>(new Set());
    const [showSummary, setShowSummary] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    // Dynamic subject selection based on intervention or props
    const activeSubject = hijackedSubject || subject;

    const hasShownExitPrompt = useRef(false);

    // Detect Exit Intent for Summary
    useEffect(() => {
        // Push a dummy history entry so we can intercept the back button
        window.history.pushState({ exitIntentGuard: true }, "");

        const checkIntentAndTrigger = () => {
            if (viewedTopics.size > 0 && !showSummary && !hasShownExitPrompt.current) {
                setShowSummary(true);
                hasShownExitPrompt.current = true;
                return true;
            }
            return false;
        };

        const handleMouseLeave = (e: MouseEvent) => {
            if (e.clientY <= 0) checkIntentAndTrigger();
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") checkIntentAndTrigger();
        };

        const handlePageHide = () => checkIntentAndTrigger();

        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (viewedTopics.size > 0 && !hasShownExitPrompt.current) {
                checkIntentAndTrigger();
                e.preventDefault();
                e.returnValue = "Wait! Don't forget to save your learning roadmap.";
                return e.returnValue;
            }
        };

        const handlePopState = (e: PopStateEvent) => {
            // The user pressed Back — intercept it and show the summary
            if (checkIntentAndTrigger()) {
                // Re-push the guard so that a second back press navigates away normally
                window.history.pushState({ exitIntentGuard: true }, "");
            }
        };

        window.addEventListener("mouseleave", handleMouseLeave);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("pagehide", handlePageHide);
        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("popstate", handlePopState);

        return () => {
            window.removeEventListener("mouseleave", handleMouseLeave);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("pagehide", handlePageHide);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("popstate", handlePopState);
        };
    }, [viewedTopics, showSummary]);

    // 2. Function to trigger background generation
    const triggerGeneration = useCallback(async () => {
        if (isGenerating) return;
        setIsGenerating(true);
        try {
            let generateSubject = activeSubject;
            let generateDifficulty = difficulty;

            // Fetch user-specific expertise for this topic from the doc
            const userSnap = await getDoc(doc(db, "users", userId));
            const userData = userSnap.data();

            if (activeSubject && userData?.topicExpertise?.[activeSubject]) {
                generateDifficulty = userData.topicExpertise[activeSubject];
            }

            if (!generateSubject) {
                if (userSubjects.length > 0) {
                    const randomSubject = userSubjects[Math.floor(Math.random() * userSubjects.length)];
                    generateSubject = randomSubject.name;
                    generateDifficulty = userData?.topicExpertise?.[generateSubject] || randomSubject.difficulty;
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
    }, [activeSubject, quizOnly]);

    // 1. Subscribe to Firestore
    useEffect(() => {
        if (!userId) return;

        let viewedReels: string[] = [];
        let retryQuizzes: string[] = [];

        const userUnsubscribe = onSnapshot(doc(db, "users", userId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                viewedReels = data?.viewedReels || [];
                retryQuizzes = data?.retryQuizzes || [];
            }
        });

        let q = query(collection(db, "feeds"), orderBy("createdAt", "desc"));
        if (activeSubject) {
            q = query(collection(db, "feeds"), where("subject", "==", activeSubject), orderBy("createdAt", "desc"));
        }

        let isFirstSnapshot = true;

        const feedsUnsubscribe = onSnapshot(q, async (snapshot) => {
            // Check if this is just a metadata update (upvotes/comments)
            // If so, skip setItems entirely — EngagementBar uses optimistic local state
            const changes = snapshot.docChanges();
            const hasStructuralChanges = isFirstSnapshot || changes.some(c => c.type === 'added' || c.type === 'removed');
            isFirstSnapshot = false;

            if (!hasStructuralChanges) {
                // Pure metadata update (upvote/comment) — do nothing to the feed list
                return;
            }

            // Build a map of all current snapshot items for fast lookup
            const snapshotMap = new Map<string, FeedItemType>();
            const retryItemsRaw: FeedItemType[] = [];

            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if (data.type) {
                    const item = { ...data, id: docSnap.id } as FeedItemType;
                    if (retryQuizzes.includes(docSnap.id)) {
                        retryItemsRaw.push(item);
                    } else if (!viewedReels.includes(docSnap.id)) {
                        if (quizOnly && data.type !== "quiz") return;
                        snapshotMap.set(docSnap.id, item);
                    }
                }
            });

            setItems(prevItems => {
                // 1. Keep existing items in their current order, just filter out viewed ones
                const updatedPrevItems = prevItems
                    .filter(p => !viewedReels.includes(p.id) || retryQuizzes.includes(p.id));

                // 2. Find genuinely NEW items not already in the list
                const existingIds = new Set(updatedPrevItems.map(p => p.id));
                const newFeedItems = Array.from(snapshotMap.values()).filter(item => !existingIds.has(item.id));
                const newRetryItems = retryItemsRaw.filter(item => !existingIds.has(item.id));

                // 3. If no new items, return the existing list unchanged
                if (newFeedItems.length === 0 && newRetryItems.length === 0) {
                    return prevItems; // Return exact same reference — no re-render
                }

                // 4. Only run shuffle + injection for genuinely new items
                if (quizOnly) {
                    return [...updatedPrevItems, ...newRetryItems, ...newFeedItems];
                }

                const newQuizzes = newFeedItems.filter(i => i.type === "quiz");
                const newGeneral = newFeedItems.filter(i => i.type !== "quiz");

                const shuffleArray = (arr: FeedItemType[]) => {
                    for (let i = arr.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [arr[i], arr[j]] = [arr[j], arr[i]];
                    }
                };
                shuffleArray(newQuizzes);
                shuffleArray(newGeneral);
                shuffleArray(newRetryItems);

                let nonQuizCountAtEnd = 0;
                for (let i = updatedPrevItems.length - 1; i >= 0; i--) {
                    if (updatedPrevItems[i].type !== "quiz") nonQuizCountAtEnd++;
                    else break;
                }

                const injectedItems: FeedItemType[] = [];
                while (newGeneral.length > 0 || newQuizzes.length > 0 || newRetryItems.length > 0) {
                    const targetGap = Math.floor(Math.random() * 3) + 7;
                    if (nonQuizCountAtEnd >= targetGap) {
                        if (newRetryItems.length > 0) {
                            injectedItems.push(newRetryItems.pop()!);
                        } else if (newQuizzes.length > 0) {
                            injectedItems.push(newQuizzes.pop()!);
                        }
                        nonQuizCountAtEnd = 0;
                    } else if (newGeneral.length > 0) {
                        injectedItems.push(newGeneral.pop()!);
                        nonQuizCountAtEnd++;
                    } else break;
                }
                return [...updatedPrevItems, ...injectedItems];
            });
            setLoading(false);

            if (snapshotMap.size === 0 && !isGenerating) triggerGeneration();
        });

        return () => {
            userUnsubscribe();
            feedsUnsubscribe();
        };
    }, [userId, activeSubject, isGenerating, triggerGeneration]);

    // 3. Track scroll position
    const lastItemRef = useCallback((node: HTMLDivElement) => {
        if (loading || isGenerating) return;
        if (observerRef.current) observerRef.current.disconnect();
        observerRef.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) triggerGeneration();
        });
        if (node) observerRef.current.observe(node);
    }, [loading, isGenerating, triggerGeneration]);

    const handleTopicViewed = useCallback((topic: string) => {
        setViewedTopics(prev => {
            if (prev.has(topic)) return prev; // Prevent React re-render infinite loops
            return new Set(prev).add(topic);
        });
    }, []);

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

            <FocusInterrupter
                userId={userId}
                onIntervention={(hijackedSubject) => {
                    setHijackedSubject(hijackedSubject);
                    if (!isGenerating) triggerGeneration();
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
                        onViewed={() => handleTopicViewed(item.topic)}
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

            <AnimatePresence>
                {showSummary && (
                    <SessionSummaryModal
                        topics={Array.from(viewedTopics)}
                        onClose={() => setShowSummary(false)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

function FeedItemWrapper({ item, userId, isTriggerElement, lastItemRef, onViewed }: { item: FeedItemType, userId: string, isTriggerElement: boolean, lastItemRef: (node: HTMLDivElement) => void, onViewed: () => void }) {
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
                    startView(item.id);
                    startTimeRef.current = Date.now();
                    viewTracked.current = true;
                    onViewed(); // Track for session summary

                    if (!hasLoggedView) {
                        hasLoggedView = true;
                        fetch("/api/track-engagement", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ userId, feedId: item.id, topic: item.topic, engagementType: "viewed" })
                        }).catch(e => console.warn("Non-fatal: Error sending viewed engagement, likely cancelled by fast scrolling:", e.message));
                    }
                } else if (viewTracked.current) {
                    endView(item.id, (item as FeedItemType).subject);
                    viewTracked.current = false;

                    if (startTimeRef.current) {
                        const durationMs = Date.now() - startTimeRef.current;
                        startTimeRef.current = null;
                        if (durationMs < 2500) {
                            fetch("/api/track-engagement", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ userId, feedId: item.id, topic: item.topic, engagementType: "avoided", durationMs })
                            }).catch(e => console.warn("Non-fatal: Error sending avoided engagement, likely cancelled by fast scrolling:", e.message));
                        }
                    }
                }
            });
        }, { threshold: 0.95 });

        observer.observe(node);
        return () => observer.disconnect();
    }, [item, userId, startView, endView, onViewed]);

    return (
        <div
            ref={(node) => {
                (cardRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
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
