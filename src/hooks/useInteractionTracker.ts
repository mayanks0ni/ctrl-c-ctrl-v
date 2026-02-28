"use client";

import { useCallback, useRef } from "react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export type InteractionType = "view" | "quiz_attempt" | "rewatch" | "binge_entry";

interface InteractionData {
    feedId: string;
    type: InteractionType;
    subject?: string;
    duration?: number; // seconds spent
    metadata?: any;
}

export const useInteractionTracker = (userId: string | undefined) => {
    const viewStartTime = useRef<{ [feedId: string]: number }>({});

    const trackInteraction = useCallback(async (data: InteractionData) => {
        if (!userId) return;

        try {
            await addDoc(collection(db, `users/${userId}/interactions`), {
                ...data,
                timestamp: serverTimestamp(),
                createdAt: new Date().toISOString()
            });
        } catch (error) {
            console.error("[Tracker] Failed to log interaction:", error);
        }
    }, [userId]);

    const startView = useCallback((feedId: string) => {
        viewStartTime.current[feedId] = Date.now();
    }, []);

    const endView = useCallback((feedId: string, subject?: string) => {
        const startTime = viewStartTime.current[feedId];
        if (startTime) {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            if (duration > 1) { // Only track if spent more than 1 second
                trackInteraction({
                    feedId,
                    type: "view",
                    subject,
                    duration
                });
            }
            delete viewStartTime.current[feedId];
        }
    }, [trackInteraction]);

    return { trackInteraction, startView, endView };
};
