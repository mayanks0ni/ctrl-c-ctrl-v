"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import FeedScroller from "@/components/feed/FeedScroller";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState, Suspense } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface SelectedSubject {
    name: string;
    difficulty: "intermediate" | "beginner" | "advanced";
}

function FeedContent() {
    const { user, loading } = useRequireAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
    const [showSelector, setShowSelector] = useState(false);

    const activeSubjectName = searchParams.get("subject");

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists() && docSnap.data().subjects) {
                    const rawSubjects = docSnap.data().subjects;
                    const normalizedSubjects = rawSubjects.map((s: SelectedSubject | string) => {
                        if (typeof s === "string") {
                            return { name: s, difficulty: "beginner" } as SelectedSubject;
                        }
                        return s;
                    });
                    setSubjects(normalizedSubjects);
                }
            });
        }
    }, [user]);

    const handleSubjectChange = (name?: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (name) {
            params.set("subject", name);
        } else {
            params.delete("subject");
        }
        router.push(`/feed?${params.toString()}`);
        setShowSelector(false);
    };

    const activeSubject = subjects.find(s => s.name === activeSubjectName);

    if (loading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
            {/* Subject Swiper / Selector */}
            <div className="absolute top-6 left-24 z-[110] flex items-center gap-2">
                <button
                    onClick={() => setShowSelector(!showSelector)}
                    className="px-4 py-2 bg-zinc-900/80 backdrop-blur-md border border-zinc-800 rounded-full text-white hover:bg-zinc-800 transition-all text-sm font-bold flex items-center gap-2 shadow-xl"
                >
                    <Zap className="w-4 h-4 text-blue-500 fill-current" />
                    {activeSubjectName || "For You"}
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showSelector ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                    {showSelector && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full mt-2 left-0 w-48 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
                        >
                            <button
                                onClick={() => handleSubjectChange()}
                                className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-800 transition-colors flex items-center gap-2 ${!activeSubjectName ? 'text-blue-500' : 'text-zinc-400'}`}
                            >
                                <Zap className="w-3 h-3 fill-current" /> For You
                            </button>
                            <div className="h-px bg-zinc-800 mx-2" />
                            <div className="max-h-60 overflow-y-auto no-scrollbar">
                                {subjects.map(s => (
                                    <button
                                        key={s.name}
                                        onClick={() => handleSubjectChange(s.name)}
                                        className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-zinc-800 transition-colors ${activeSubjectName === s.name ? 'text-blue-500' : 'text-zinc-400'}`}
                                    >
                                        {s.name}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <FeedScroller
                userId={user.uid}
                subject={activeSubject?.name}
                difficulty={activeSubject?.difficulty}
                userSubjects={subjects}
            />
        </div>
    );
}

export default function FeedPage() {
    return (
        <Suspense fallback={
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        }>
            <FeedContent />
        </Suspense>
    );
}
