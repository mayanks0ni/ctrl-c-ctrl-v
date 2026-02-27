"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import FeedScroller from "@/components/feed/FeedScroller";
import { Loader2, User, Plus, LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface SelectedSubject {
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
}

export default function FeedPage() {
    const { user, loading } = useRequireAuth();
    const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
    const [activeSubject, setActiveSubject] = useState<SelectedSubject | undefined>(undefined);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists() && docSnap.data().subjects) {
                    const rawSubjects = docSnap.data().subjects;
                    // Normalize subjects in case they are still strings from the old schema
                    const normalizedSubjects = rawSubjects.map((s: any) => {
                        if (typeof s === "string") {
                            return { name: s, difficulty: "beginner" };
                        }
                        return s;
                    });
                    setSubjects(normalizedSubjects);
                }
            });
        }
    }, [user]);

    if (loading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
            {/* Top Navigation Overlay */}
            <div className="absolute top-0 w-full z-50 pt-12 pb-4 px-6 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
                <div className="flex justify-between items-center pointer-events-auto max-w-lg mx-auto">
                    {/* Profile & Upload */}
                    <div className="flex items-center gap-2">
                        <Link href="/profile" className="w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center border border-zinc-700 backdrop-blur-md text-white hover:bg-zinc-700 transition">
                            <User className="w-5 h-5" />
                        </Link>
                        <Link href="/forum" className="w-10 h-10 bg-zinc-800/80 rounded-full flex items-center justify-center border border-zinc-700 backdrop-blur-md text-white hover:bg-zinc-700 transition">
                            <Users className="w-5 h-5" />
                        </Link>
                    </div>

                    {/* Subject Switcher */}
                    <div className="flex bg-zinc-900/50 backdrop-blur-md border border-white/10 rounded-full p-1 scroll-smooth overflow-x-auto no-scrollbar max-w-[70vw]">
                        <button
                            onClick={() => setActiveSubject(undefined)}
                            className={`shrink-0 px-4 py-1.5 text-sm font-bold rounded-full whitespace-nowrap transition-all ${!activeSubject ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                        >
                            For You
                        </button>
                        {subjects.map(subj => (
                            <button
                                key={subj.name}
                                onClick={() => setActiveSubject(subj)}
                                className={`shrink-0 px-4 py-1.5 text-sm font-bold rounded-full whitespace-nowrap transition-all ${activeSubject?.name === subj.name ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
                            >
                                {subj.name}
                            </button>
                        ))}
                    </div>

                    <Link href="/upload" className="w-10 h-10 bg-blue-600/80 rounded-full flex items-center justify-center border border-blue-500 backdrop-blur-md text-white hover:bg-blue-500 transition">
                        <Plus className="w-5 h-5" />
                    </Link>
                </div>
            </div>

            {/* The Scroller */}
            <FeedScroller userId={user.uid} subject={activeSubject?.name} difficulty={activeSubject?.difficulty} />
        </div>
    );
}
