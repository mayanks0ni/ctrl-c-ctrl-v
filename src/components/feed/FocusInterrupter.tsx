"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BookOpen, UserX, Clock, X, ChevronRight } from "lucide-react";

interface ScheduleItem {
    subject: string;
    day: string;
    startTime: string; // "HH:mm"
    endTime: string;   // "HH:mm"
}

interface FocusInterrupterProps {
    userId: string;
    onIntervention: (subjectToStudy: string) => void;
}

export default function FocusInterrupter({ userId, onIntervention }: FocusInterrupterProps) {
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [activeClass, setActiveClass] = useState<ScheduleItem | null>(null);
    const [isDismissed, setIsDismissed] = useState(false);
    const [selectedReason, setSelectedReason] = useState<string | null>(null);

    // 1. Listen to user's schedule in Firestore
    useEffect(() => {
        if (!userId) return;
        const unsubscribe = onSnapshot(doc(db, "users", userId, "metadata", "schedule"), (docSnap) => {
            if (docSnap.exists()) {
                setSchedule(docSnap.data().items || []);
            }
        });
        return () => unsubscribe();
    }, [userId]);

    // 2. Poll current time to see if user is slacking off during a scheduled class
    useEffect(() => {
        if (schedule.length === 0 || isDismissed) return;

        const checkSchedule = () => {
            const now = new Date();
            const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
            const currentDay = days[now.getDay()];

            const currentHours = now.getHours().toString().padStart(2, "0");
            const currentMinutes = now.getMinutes().toString().padStart(2, "0");
            const currentTimeStr = `${currentHours}:${currentMinutes}`;

            const ongoingClass = schedule.find(item => {
                return item.day.toLowerCase() === currentDay.toLowerCase() &&
                    currentTimeStr >= item.startTime &&
                    currentTimeStr <= item.endTime;
            });

            if (ongoingClass) {
                setActiveClass(ongoingClass);
            } else {
                setActiveClass(null);
            }
        };

        checkSchedule();
        const interval = setInterval(checkSchedule, 60000); // Check every minute
        return () => clearInterval(interval);
    }, [schedule, isDismissed]);

    if (!activeClass || isDismissed) return null;

    const handleReasonSelect = (reason: string) => {
        setSelectedReason(reason);
        setTimeout(() => {
            // Trigger the intervention callback, feeding the subject back up to the FeedScroller
            onIntervention(activeClass.subject);
            setIsDismissed(true);
        }, 800);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
            >
                <div className="absolute top-0 w-full h-full bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.15)_0,transparent_100%)] pointer-events-none" />

                <div className="bg-zinc-900 border border-purple-500/30 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.15)] relative overflow-hidden">

                    {/* Pulsing warning indicator */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse" />

                    <div className="flex justify-between items-start mb-6">
                        <div className="w-14 h-14 bg-orange-500/20 rounded-2xl flex items-center justify-center border border-orange-500/30">
                            <AlertTriangle className="w-7 h-7 text-orange-400" />
                        </div>
                        <button
                            onClick={() => setIsDismissed(true)}
                            className="p-2 bg-zinc-800 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-700 transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Focus Check</h2>

                    <div className="bg-zinc-950 rounded-xl p-4 mb-6 border border-zinc-800/50">
                        <p className="text-zinc-400 text-sm mb-1">According to your timetable, you are currently in:</p>
                        <p className="text-xl font-bold text-purple-400 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" /> {activeClass.subject}
                        </p>
                        <p className="text-xs text-zinc-500 mt-2 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {activeClass.startTime} - {activeClass.endTime}
                        </p>
                    </div>

                    {!selectedReason ? (
                        <>
                            <h3 className="text-zinc-300 font-medium mb-4">Why are you scrolling instead of studying?</h3>
                            <div className="space-y-3">
                                <button
                                    onClick={() => handleReasonSelect("prof_bad")}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-left border border-zinc-700/50 hover:border-zinc-500 transition-all group"
                                >
                                    <span className="flex items-center gap-3 text-white font-medium">
                                        <UserX className="w-5 h-5 text-zinc-400 group-hover:text-red-400 transition" />
                                        Professor isn&apos;t teaching properly
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition" />
                                </button>

                                <button
                                    onClick={() => handleReasonSelect("bored")}
                                    className="w-full flex items-center justify-between p-4 rounded-xl bg-zinc-800/50 hover:bg-zinc-800 text-left border border-zinc-700/50 hover:border-zinc-500 transition-all group"
                                >
                                    <span className="flex items-center gap-3 text-white font-medium">
                                        <Clock className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition" />
                                        Lecture is too slow / I am bored
                                    </span>
                                    <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-white transition" />
                                </button>
                            </div>
                        </>
                    ) : (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-6">
                            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BookOpen className="w-8 h-8 text-purple-400 animate-pulse" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Switching focus...</h3>
                            <p className="text-zinc-400 text-sm">We are hijacking your feed to teach you <span className="text-purple-400 font-bold">{activeClass.subject}</span> right now.</p>
                        </motion.div>
                    )}

                </div>
            </motion.div>
        </AnimatePresence>
    );
}
