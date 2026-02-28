"use client";

import { useState, useEffect, Suspense } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, Zap, ArrowRight, ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import FeedScroller from "@/components/feed/FeedScroller";
import { motion, AnimatePresence } from "framer-motion";

interface SelectedSubject {
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
}

function QuizContent() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [userSubjects, setUserSubjects] = useState<SelectedSubject[]>([]);
    const [hasSelected, setHasSelected] = useState(false);
    const [selectedSubject, setSelectedSubject] = useState<string>("");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("beginner");
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists() && docSnap.data().subjects) {
                    const rawSubjects = docSnap.data().subjects;
                    const normalized = rawSubjects.map((s: SelectedSubject | string) => {
                        if (typeof s === "string") return { name: s, difficulty: "beginner" };
                        return s;
                    });
                    setUserSubjects(normalized);
                    if (normalized.length > 0) setSelectedSubject(normalized[0].name);
                }
            }).finally(() => setFetching(false));
        }
    }, [user]);

    if (authLoading || fetching) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    if (hasSelected) {
        return (
            <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
                <button
                    onClick={() => setHasSelected(false)}
                    className="absolute top-6 left-24 z-[110] px-4 py-2 bg-zinc-900/80 border border-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all text-sm font-bold flex items-center gap-2"
                >
                    <ArrowRight className="w-4 h-4 rotate-180" /> Change Settings
                </button>
                <FeedScroller
                    userId={user!.uid}
                    subject={selectedSubject}
                    difficulty={selectedDifficulty}
                    quizOnly={true}
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 lg:pl-32">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] left-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full relative z-10"
            >
                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 text-white">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="w-10 h-10">
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    </div>
                    <h1 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500">
                        Quiz Mode
                    </h1>
                    <p className="text-zinc-500 font-medium">Test your knowledge with focused challenges.</p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-4 mb-2 block">
                            Select Subject
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                className="w-full bg-zinc-900/50 border border-zinc-800/50 rounded-2xl px-5 py-4 text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-semibold"
                            >
                                <option value="">General Knowledge</option>
                                {userSubjects.map(s => (
                                    <option key={s.name} value={s.name}>{s.name}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500 pointer-events-none group-hover:text-white transition-colors" />
                        </div>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 ml-4 mb-2 block">
                            Difficulty Level
                        </label>
                        <div className="grid grid-cols-3 gap-3">
                            {['beginner', 'intermediate', 'advanced'].map((d) => (
                                <button
                                    key={d}
                                    onClick={() => setSelectedDifficulty(d)}
                                    className={`py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedDifficulty === d
                                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-600/20'
                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-300 hover:border-zinc-700'
                                        }`}
                                >
                                    {d}
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={() => setHasSelected(true)}
                        className="w-full mt-4 bg-white text-black py-5 rounded-[2rem] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-white/5 group"
                    >
                        Start Challenge <Zap className="w-5 h-5 fill-current" />
                    </button>

                    <p className="text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-6">
                        +10 XP per correct answer
                    </p>
                </div>
            </motion.div>
        </div>
    );
}

export default function QuizzesPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-black"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <QuizContent />
        </Suspense>
    );
}
