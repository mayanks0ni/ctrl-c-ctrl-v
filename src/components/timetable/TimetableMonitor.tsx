"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase/config";
import { doc, onSnapshot } from "firebase/firestore";
import FocusQuestionnaire from "./FocusQuestionnaire";

interface ScheduleItem {
    subject: string;
    day: string;
    startTime: string;
    endTime: string;
}

export default function TimetableMonitor({ userId }: { userId: string }) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [activeClass, setActiveClass] = useState<string | null>(null);
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [hasIntervenedThisSession, setHasIntervenedThisSession] = useState(false);

    useEffect(() => {
        if (!userId) return;

        // 1. Listen to schedule changes
        const unsubscribe = onSnapshot(doc(db, `users/${userId}/metadata`, "schedule"), (docSnap) => {
            if (docSnap.exists()) {
                setSchedule(docSnap.data().items || []);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    useEffect(() => {
        if (schedule.length === 0 || hasIntervenedThisSession) return;

        const checkSchedule = () => {
            const now = new Date();
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = days[now.getDay()];
            const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            const currentClass = schedule.find(item => {
                return item.day === currentDay &&
                    currentTime >= item.startTime &&
                    currentTime <= item.endTime;
            });

            if (currentClass) {
                setActiveClass(currentClass.subject);
                // Trigger modal
                setShowQuestionnaire(true);
                setHasIntervenedThisSession(true); // Don't annoy them again in the same session
            } else {
                setActiveClass(null);
            }
        };

        // Check immediately
        checkSchedule();

        // Then check every minute
        const interval = setInterval(checkSchedule, 60000);
        return () => clearInterval(interval);
    }, [schedule, hasIntervenedThisSession]);

    if (!showQuestionnaire || !activeClass) return null;

    return (
        <FocusQuestionnaire
            subject={activeClass}
            userId={userId}
            onClose={() => setShowQuestionnaire(false)}
        />
    );
}
