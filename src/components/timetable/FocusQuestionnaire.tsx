"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trophy, BookOpen, MessageSquare, ArrowRight, Loader2, PlayCircle, HelpCircle, Sparkles } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, query, where, orderBy, limit, getDocs } from "firebase/firestore";

interface FocusQuestionnaireProps {
    subject: string;
    userId: string;
    onClose: () => void;
}

export default function FocusQuestionnaire({ subject, userId, onClose }: FocusQuestionnaireProps) {
    const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
    const [reason, setReason] = useState("");
    const [topic, setTopic] = useState("");
    const [generating, setGenerating] = useState(false);
    const [content, setContent] = useState<any[]>([]);

    const reasons = [
        { id: "boring", label: "Professor is boring", icon: "😴" },
        { id: "lost", label: "I'm feeling lost", icon: "😵‍💫" },
        { id: "missed", label: "Missed previous lecture", icon: "🏃‍♂️" },
        { id: "not_interested", label: "Subject isn't interesting", icon: "🙄" },
        { id: "hard", label: "Topic is too difficult", icon: "🧠" },
    ];

    const handleTopicSubmit = async () => {
        if (!topic) return;
        setGenerating(true);
        setStep(4);

        try {
            // Trigger generation
            await fetch("/api/generate-feed", {
                method: "POST",
                body: JSON.stringify({
                    userId,
                    subject: topic,
                    expertiseLevel: "beginner"
                })
            });

            // Fetch the newly generated items
            const feedsRef = collection(db, "feeds");
            const q = query(
                feedsRef,
                where("authorId", "==", userId),
                where("subject", "==", topic),
                orderBy("createdAt", "desc"),
                limit(5)
            );
            const querySnapshot = await getDocs(q);
            const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setContent(items);
        } catch (error) {
            console.error("Failed to generate focus content:", error);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl relative"
                >
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <div className="p-8 pt-12">
                        {step === 1 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
                                <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mx-auto text-blue-400">
                                    <BookOpen className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white mb-2">Focus Check! 🧠</h2>
                                    <p className="text-zinc-400">Our records show you should be in <b>{subject}</b> class right now. Having trouble staying focused?</p>
                                </div>
                                <div className="flex flex-col gap-3 pt-4">
                                    <button
                                        onClick={() => setStep(2)}
                                        className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-all flex items-center justify-center gap-2"
                                    >
                                        Yes, I'm distracted <ArrowRight className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={onClose}
                                        className="w-full py-4 bg-zinc-800 text-white font-bold rounded-2xl hover:bg-zinc-700 transition-all"
                                    >
                                        No, I'm just taking a quick break
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-white mb-2">What's the issue?</h2>
                                    <p className="text-zinc-400 text-sm">Be honest, we've all been there.</p>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {reasons.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => { setReason(r.id); setStep(3); }}
                                            className="p-4 bg-zinc-800/50 border border-zinc-800 rounded-2xl flex items-center gap-4 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-left group"
                                        >
                                            <span className="text-2xl">{r.icon}</span>
                                            <span className="font-medium text-white group-hover:translate-x-1 transition-transform">{r.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-white mb-2">Let's fix that. ✨</h2>
                                    <p className="text-zinc-400 text-sm">Tell us what topic is being covered, and we'll give you something more engaging to learn from.</p>
                                </div>
                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        placeholder="Enter current topic (e.g. Calculus, Photosynthesis...)"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        className="w-full p-4 bg-zinc-950 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    />
                                    <button
                                        onClick={handleTopicSubmit}
                                        disabled={!topic}
                                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        Generate Rescue Material <Sparkles className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 4 && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-h-[60vh] overflow-y-auto no-scrollbar pr-2">
                                <div className="text-center sticky top-0 bg-zinc-900 py-2 z-10">
                                    <h2 className="text-2xl font-black text-white mb-2">Rescue Materials 📦</h2>
                                    <p className="text-zinc-400 text-sm">Stay in class, but learn your style.</p>
                                </div>

                                {generating ? (
                                    <div className="flex flex-col items-center justify-center py-12 gap-4">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                                        <p className="text-white font-bold">Curating content for you...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {content.map((item, idx) => (
                                            <motion.div
                                                key={item.id}
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: idx * 0.1 }}
                                                className="bg-zinc-800/50 border border-zinc-800 rounded-2xl p-4 space-y-3"
                                            >
                                                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-blue-400">
                                                    {item.type === 'quiz' ? <HelpCircle className="w-3 h-3" /> : <PlayCircle className="w-3 h-3" />}
                                                    {item.type}
                                                </div>
                                                <h4 className="font-bold text-white tracking-tight">{item.topic}</h4>
                                                <p className="text-sm text-zinc-400 line-clamp-2">{item.summary}</p>
                                                <button className="w-full py-2 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-bold rounded-xl transition-colors">
                                                    View Now
                                                </button>
                                            </motion.div>
                                        ))}
                                        <button
                                            onClick={onClose}
                                            className="w-full py-4 text-zinc-400 text-sm font-bold hover:text-white transition-colors"
                                        >
                                            I'm focusing now, thanks!
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
