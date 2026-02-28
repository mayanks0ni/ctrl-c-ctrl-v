"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Brain, TrendingUp, History, Users, ChevronRight, BarChart3, Clock, Sparkles, Download, Loader2 } from "lucide-react";
import { collection, query, getDocs, orderBy, limit } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { toPng } from "html-to-image";

interface EduWrappedProps {
    userId: string;
    displayName: string;
    xp: number;
    subjects: { name: string; difficulty: string }[];
    comrades: any[];
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export default function EduWrapped({ userId, displayName, xp, subjects, comrades }: EduWrappedProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const downloadRef = useRef<HTMLDivElement>(null);
    const [interactions, setInteractions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [activeSlide, setActiveSlide] = useState(0);

    const currentMonth = MONTH_NAMES[new Date().getMonth()];

    const downloadWrapped = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!downloadRef.current) return;

        try {
            setIsDownloading(true);
            await new Promise(resolve => setTimeout(resolve, 300));

            const dataUrl = await toPng(downloadRef.current, {
                pixelRatio: 4,
                backgroundColor: '#09090b',
                width: 1080,
                height: 1920,
            });

            const link = document.createElement('a');
            link.download = `edu-wrapped-${currentMonth.toLowerCase()}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setIsDownloading(false);
        }
    };

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
        const subjectCounts: Record<string, number> = {};
        interactions.forEach(i => {
            if (i.subject) subjectCounts[i.subject] = (subjectCounts[i.subject] || 0) + 1;
        });
        const topSubjects = Object.entries(subjectCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([name]) => name);

        const avgDuration = interactions.length > 0
            ? interactions.reduce((acc, curr) => acc + (curr.duration || 0), 0) / interactions.length
            : 0;

        const hour = new Date().getHours();
        let personality = "The Explorer";
        if (avgDuration > 60) personality = "The Deep Diver";
        else if (interactions.length > 20) personality = "The Infovore";

        if (hour < 6) personality = "The Midnight Scholar";
        else if (hour > 21) personality = "The Night Owl";

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
                    <p className="text-zinc-500 text-sm mb-4">You&apos;ve been obsessing over these subjects lately:</p>
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
                <div className="flex gap-2 items-center">
                    <button
                        onClick={downloadWrapped}
                        disabled={isDownloading}
                        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
                    >
                        {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        Download 4K
                    </button>
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            onClick={(e) => {
                                e.stopPropagation();
                                setActiveSlide(i);
                            }}
                            className={`w-2 h-2 rounded-full transition-all ${activeSlide === i ? 'bg-white w-6' : 'bg-zinc-700'}`}
                        />
                    ))}
                </div>
            </div>

            {/* Interactive Slideshow (visible on page) */}
            <div
                ref={containerRef}
                onClick={() => setActiveSlide((prev) => (prev + 1) % slides.length)}
                className="relative overflow-hidden bg-zinc-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] min-h-[400px] cursor-pointer group hover:bg-zinc-900/60 transition-colors"
            >
                <div className="absolute top-4 left-6 right-6 flex gap-2 z-20">
                    {slides.map((_, i) => (
                        <div key={i} className="h-1 flex-1 bg-white/10 rounded-full overflow-hidden">
                            <motion.div
                                initial={false}
                                animate={{
                                    width: activeSlide === i ? "100%" : (i < activeSlide ? "100%" : "0%"),
                                    opacity: i <= activeSlide ? 1 : 0.3
                                }}
                                transition={{ duration: 0.3 }}
                                className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]"
                            />
                        </div>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeSlide}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, ease: "easeOut" }}
                        className="p-10 pt-16 h-full flex flex-col justify-between"
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
                            <div className="flex items-center gap-2 text-[10px] font-mono opacity-50">
                                <span>STABLE_WRAP_V1</span>
                                <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Hidden Downloadable Summary Card (off-screen, rendered for capture) */}
            <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
                <div
                    ref={downloadRef}
                    style={{
                        width: 1080,
                        height: 1920,
                        background: 'linear-gradient(160deg, #09090b 0%, #1a1a2e 40%, #16213e 70%, #0f3460 100%)',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        color: 'white',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: 80,
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    {/* Background glow effects */}
                    <div style={{ position: 'absolute', top: -200, right: -200, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.15) 0%, transparent 70%)' }} />
                    <div style={{ position: 'absolute', bottom: -100, left: -100, width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, transparent 70%)' }} />

                    {/* Header */}
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                            <div style={{ fontSize: 48 }}>✨</div>
                            <div>
                                <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 6, textTransform: 'uppercase' as const, color: '#71717a' }}>
                                    EDU WRAPPED
                                </div>
                                <div style={{ fontSize: 28, fontWeight: 800, color: '#a1a1aa' }}>
                                    {currentMonth} 2026
                                </div>
                            </div>
                        </div>
                        <div style={{ width: '100%', height: 1, background: 'linear-gradient(90deg, rgba(59,130,246,0.5), rgba(168,85,247,0.5), transparent)', marginTop: 24 }} />
                    </div>

                    {/* Main Content */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 48 }}>
                        {/* Username */}
                        <div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#71717a', textTransform: 'uppercase' as const, letterSpacing: 4, marginBottom: 12 }}>
                                Learner
                            </div>
                            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.1 }}>
                                {displayName}
                            </div>
                        </div>

                        {/* XP */}
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 32, padding: '36px 44px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase' as const, letterSpacing: 4, marginBottom: 8 }}>
                                Total XP Earned
                            </div>
                            <div style={{ fontSize: 72, fontWeight: 900, background: 'linear-gradient(135deg, #60a5fa, #a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                {xp.toLocaleString()} XP
                            </div>
                        </div>

                        {/* Top Subjects */}
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 700, color: '#71717a', textTransform: 'uppercase' as const, letterSpacing: 4, marginBottom: 24 }}>
                                Most Studied
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                {insights.interestList.slice(0, 4).map((topic, i) => (
                                    <div
                                        key={topic}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 20,
                                            background: 'rgba(255,255,255,0.04)',
                                            borderRadius: 20,
                                            padding: '20px 28px',
                                            border: '1px solid rgba(255,255,255,0.06)',
                                        }}
                                    >
                                        <span style={{ fontWeight: 900, fontSize: 28, color: i === 0 ? '#60a5fa' : i === 1 ? '#a78bfa' : i === 2 ? '#34d399' : '#fbbf24', minWidth: 44 }}>
                                            #{i + 1}
                                        </span>
                                        <span style={{ fontWeight: 700, fontSize: 28, textTransform: 'capitalize' as const }}>
                                            {topic}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div style={{ display: 'flex', gap: 24 }}>
                            <div style={{ flex: 1, background: 'rgba(168,85,247,0.1)', borderRadius: 24, padding: '28px 32px', border: '1px solid rgba(168,85,247,0.15)' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#a78bfa', letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                                    Personality
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>
                                    {insights.personality}
                                </div>
                            </div>
                            <div style={{ flex: 1, background: 'rgba(59,130,246,0.1)', borderRadius: 24, padding: '28px 32px', border: '1px solid rgba(59,130,246,0.15)' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: '#60a5fa', letterSpacing: 3, textTransform: 'uppercase' as const, marginBottom: 6 }}>
                                    Rank
                                </div>
                                <div style={{ fontSize: 24, fontWeight: 800 }}>
                                    Top {100 - insights.edgePercent}%
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 32 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#52525b', letterSpacing: 4, textTransform: 'uppercase' as const }}>
                            ✨ Powered by GenAI
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#3f3f46', fontFamily: 'monospace' }}>
                            STABLE_WRAP_V2
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
