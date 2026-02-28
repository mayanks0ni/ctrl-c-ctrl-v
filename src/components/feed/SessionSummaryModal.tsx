"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Trophy, Sparkles, ArrowRight, Loader2, BookOpen } from "lucide-react";

interface SessionSummaryModalProps {
    topics: string[];
    onClose: () => void;
}

export default function SessionSummaryModal({ topics, onClose }: SessionSummaryModalProps) {
    const [summary, setSummary] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [xp, setXp] = useState(0);

    useEffect(() => {
        const fetchSummary = async () => {
            try {
                const res = await fetch("/api/summarize-session", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ topics }),
                });
                const data = await res.json();
                setSummary(data.summary);
                setXp(topics.length * 15); // 15 XP per topic viewed
            } catch (error) {
                console.error("Failed to fetch session summary", error);
                setSummary("You've covered some great ground today! Keep up the momentum.");
            } finally {
                setLoading(false);
            }
        };

        if (topics.length > 0) {
            fetchSummary();
        }
    }, [topics]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl shadow-blue-500/10"
            >
                {/* Header */}
                <div className="relative h-32 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative text-center">
                        <div className="flex justify-center mb-1">
                            <Trophy className="w-8 h-8 text-yellow-400 drop-shadow-lg" />
                        </div>
                        <h2 className="text-xl font-bold text-white uppercase tracking-widest">Session Summary</h2>
                    </div>
                </div>

                <div className="p-8">
                    {/* XP & Stats */}
                    <div className="flex gap-4 mb-8">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">XP Earned</p>
                            <p className="text-2xl font-black text-blue-400">+{xp}</p>
                        </div>
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-1">Concepts</p>
                            <p className="text-2xl font-black text-purple-400">{topics.length}</p>
                        </div>
                    </div>

                    {/* AI Flow Summary */}
                    <div className="mb-8">
                        <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold text-sm uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" /> The Learning Flow
                        </div>

                        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/5 relative">
                            {loading ? (
                                <div className="flex flex-col items-center py-8 text-zinc-500 italic">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4 text-blue-500" />
                                    Synthesizing your journey...
                                </div>
                            ) : (
                                <p className="text-zinc-200 text-lg leading-relaxed font-medium italic italic-quote">
                                    &quot;{summary}&quot;
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Concepts Timeline */}
                    <div className="mb-8">
                        <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4 px-2">Key Topics Covered</p>
                        <div className="flex flex-wrap gap-2">
                            {topics.map((t, i) => (
                                <div key={i} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-zinc-300">
                                    <BookOpen className="w-3 h-3 text-blue-400" />
                                    {t}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Footer Action */}
                    <button
                        onClick={onClose}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-95"
                    >
                        Continue Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
