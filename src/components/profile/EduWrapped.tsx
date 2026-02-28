"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, TrendingUp, History, Users, ChevronRight, BarChart3, Clock, Sparkles } from "lucide-react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

interface EduWrappedProps {
    userId: string;
    xp: number;
    subjects: { name: string; difficulty: string }[];
    comrades: any[];
}

export default function EduWrapped({ userId, xp, subjects, comrades }: EduWrappedProps) {
    const [interactions, setInteractions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeSlide, setActiveSlide] = useState(0);

    useEffect(() => {
        const fetchInteractions = async () => {
            if (!userId) return;
            try {
                const q = query(
                    collection(db, `users/${userId}/interactions`),
                    orderBy("timestamp", "desc"),
                    limit(100)
                );
                const snapshot = await getDocs(q);
                setInteractions(snapshot.docs.map(doc => doc.data()));
            } catch (err) {
                console.error("Failed to fetch interactions:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchInteractions();
    }, [userId]);

    // Analytical Insights
    const insights = useMemo(() => {
        // 1. Top subjects from interactions
        const subjectCounts: Record<string, number> = {};
        interactions.forEach(i => {
            if (i.subject) subjectCounts[i.subject] = (subjectCounts[i.subject] || 0) + 1;
        });
        const topSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        // 2. Personality detection
        const avgDuration = interactions.length > 0
            ? interactions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / interactions.length
            : 0;

        const hour = new Date().getHours();
        let personality = "The Explorer";
        if (avgDuration > 60) personality = "The Deep Diver";
        else if (interactions.length > 20) personality = "The Infovore";

        if (hour < 6) personality = "The Midnight Scholar";
        else if (hour > 21) personality = "The Night Owl";

        // 3. Social Edge
        const betterThan = comrades.filter(c => xp > (c.xp || 0)).length;
        const edgePercent = comrades.length > 0
            ? Math.round((betterThan / comrades.length) * 100)
            : 100;

        return {
            topTopic: topSubjects[0] || (subjects[0]?.name) || "General Knowledge",
            interestList: topSubjects.length > 0 ? topSubjects : (subjects.map(s => s.name).slice(0, 3)),
            personality,
            edgePercent,
            totalInteractions: interactions.length
        };
    }, [interactions, subjects, comrades, xp]);

    const slides = [
        {
            id: "main",
            title: "Your Monthly Learning Vibe",
            icon: <Sparkles className="w-8 h-8 text-yellow-400" />,
            content: (
                <div className="space-y-4">
                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-2">Top Topic</p>
                        <h3 className="text-3xl font-black text-white capitalize">{insights.topTopic}</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-purple-500/10 rounded-3xl p-6 border border-purple-500/20">
                            <p className="text-purple-400 text-xs font-bold uppercase tracking-widest mb-1">Identity</p>
                            <h4 className="text-lg font-bold text-white">{insights.personality}</h4>
                        </div>
                        <div className="bg-blue-500/10 rounded-3xl p-6 border border-blue-500/20">
                            <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">XP Power</p>
                            <h4 className="text-lg font-bold text-white">Top {100 - insights.edgePercent}%</h4>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "topics",
            title: "Your Radar",
            icon: <Brain className="w-8 h-8 text-blue-400" />,
            content: (
                <div className="space-y-3">
                    <p className="text-zinc-500 text-sm mb-4">You've been obsessing over these subjects lately:</p>
                    {insights.interestList.map((topic, i) => (
                        <motion.div
                            key={topic}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-white/5"
                        >
                            <span className="text-blue-500 font-black text-xl w-6">#0{i + 1}</span>
                            <span className="text-white font-bold capitalize">{topic}</span>
                        </motion.div>
                    ))}
                </div>
            )
        },
        {
            id: "habits",
            title: "The Grind",
            icon: <Clock className="w-8 h-8 text-green-400" />,
            content: (
                <div className="space-y-6">
                    <div className="flex items-center gap-6">
                        <div className="w-20 h-20 rounded-full border-4 border-green-500/30 border-t-green-500 flex items-center justify-center text-xl font-black text-white">
                            {insights.totalInteractions}
                        </div>
                        <div>
                            <h4 className="text-xl font-bold text-white">Knowledge Hits</h4>
                            <p className="text-sm text-zinc-500">lessons consumed this month</p>
                        </div>
                    </div>
                    <div className="bg-zinc-900/80 p-6 rounded-3xl border border-white/5">
                        <p className="text-zinc-300 text-lg leading-relaxed italic">
                            &quot;You tend to learn in quick, high-intensity bursts. A true modern scholar.&quot;
                        </p>
                    </div>
                </div>
            )
        }
    ];

    if (loading) return null;

    return (
        <section className="mt-12 mb-12">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-2">
                        Edu Wrapped <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-tighter">New</span>
                    </h2>
                    <p className="text-zinc-500 text-sm">Your learning journey, synthesized.</p>
                </div>
                <div className="flex gap-2">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={() => setActiveSlide(i)}
                            className={`w-2 h-2 rounded-full transition-all ${activeSlide === i ? 'bg-white w-6' : 'bg-zinc-700'}`}
                        />
                    ))}
                </div>
            </div>

            <div className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] min-h-[400px]">
                <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
                    <motion.div
                        initial={{ width: "0%" }}
                        animate={{ width: "100%" }}
                        key={activeSlide}
                        transition={{ duration: 5, ease: "linear" }}
                        onAnimationComplete={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                        className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="p-10 h-full flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
                                {slides[activeSlide].icon}
                            </div>
                            <h3 className="text-2xl font-black text-white leading-none">
                                {slides[activeSlide].title}
                            </h3>
                        </div>

                        <div className="flex-1">
                            {slides[activeSlide].content}
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between text-zinc-500">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                                <Sparkles className="w-4 h-4" /> Insight Gen-AI
                            </div>
                            <p className="text-[10px] font-mono opacity-50">STABLE_WRAP_V1</p>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </section>
    );
}
