"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { X, Trophy, Sparkles, ArrowRight, Loader2, Download } from "lucide-react";
import { toPng } from "html-to-image";

interface SessionSummaryModalProps {
    topics: string[];
    onClose: () => void;
}

export default function SessionSummaryModal({ topics, onClose }: SessionSummaryModalProps) {
    const [summary, setSummary] = useState<string>("");
    const [flowchart, setFlowchart] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [xp, setXp] = useState(0);
    const chartRef = useRef<HTMLDivElement>(null);

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
                if (data.flowchart) setFlowchart(data.flowchart);
                setXp(topics.length * 15);
            } catch (error) {
                console.error("Failed to fetch session summary", error);
                setSummary("You've covered some great ground today! Keep up the momentum.");
            } finally {
                setLoading(false);
            }
        };

        if (topics.length > 0) fetchSummary();
    }, [topics]);

    const handleDownload = async () => {
        if (!chartRef.current) return;
        setDownloading(true);
        try {
            const dataUrl = await toPng(chartRef.current, {
                backgroundColor: "#18181b",
                pixelRatio: 2,
            });
            const link = document.createElement("a");
            link.href = dataUrl;
            link.download = "Cascade_Learning_Roadmap.png";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error("Download failed:", err);
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-zinc-900 border border-white/10 rounded-[32px] w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl shadow-blue-500/10 no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {/* Header */}
                <div className="relative h-32 flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-600 to-purple-700 flex-shrink-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20" />
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white transition-colors z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>
                    <div className="relative text-center z-10">
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

                    {/* Topics List */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3 text-purple-400 font-bold text-xs uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" /> Topics Studied
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {topics.map((t, i) => (
                                <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-sm text-zinc-200 font-medium">
                                    {t}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* AI Summary */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold text-sm uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" /> The Learning Flow
                        </div>
                        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/5">
                            {loading ? (
                                <div className="flex flex-col items-center py-6 text-zinc-500 italic">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4 text-blue-500" />
                                    Synthesizing your journey...
                                </div>
                            ) : (
                                <p className="text-zinc-200 text-base leading-relaxed font-medium italic">
                                    &quot;{summary}&quot;
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Mermaid Visual Roadmap */}
                    {!loading && flowchart && (
                        <div ref={chartRef} className="mb-8 p-6 bg-zinc-800 rounded-xl border border-white/10">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4">Your Roadmap</p>
                            <div className="w-full overflow-x-auto pb-2">
                                <MermaidRender chart={flowchart} />
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3">
                        {!loading && flowchart && (
                            <button
                                onClick={handleDownload}
                                disabled={downloading}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 border border-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                {downloading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Download className="w-5 h-5" />
                                )}
                                {downloading ? "Generating..." : "Download Map"}
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all group active:scale-95"
                        >
                            Continue Journey <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

function MermaidRender({ chart }: { chart: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!containerRef.current || !chart) return;

        const id = `mermaid-${Math.random().toString(36).slice(2)}`;

        import('mermaid').then(async (mermaid) => {
            mermaid.default.initialize({
                startOnLoad: false,
                theme: 'dark',
                securityLevel: 'loose',
                fontFamily: 'Inter, sans-serif',
            });

            try {
                const { svg } = await mermaid.default.render(id, chart);
                if (containerRef.current) {
                    containerRef.current.innerHTML = svg;
                }
            } catch (err) {
                console.error("Mermaid render error:", err);
                if (containerRef.current) {
                    containerRef.current.innerHTML = `<p class="text-zinc-500 text-sm text-center py-4">Could not render flowchart.</p>`;
                }
            }
        });
    }, [chart]);

    return <div ref={containerRef} className="w-full min-h-[150px] flex items-center justify-center" />;
}
