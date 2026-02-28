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
    const [flowchart, setFlowchart] = useState<string>("");
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
                if (data.flowchart) setFlowchart(data.flowchart);
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

    const handleDownload = () => {
        // Find the injected mermaid SVG path
        const svgElement = document.querySelector(".mermaid svg");
        if (!svgElement) return;

        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgElement);

        // Add namespaces
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+"http\:\/\/www\.w3\.org\/1999\/xlink"/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }
        // Add minimal black-white transparent styles for SVG download export visibility
        source = '<?xml version="1.0" standalone="no"?>\r\n' + source;
        const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source);

        const downloadLink = document.createElement("a");
        downloadLink.href = url;
        downloadLink.download = "My_Hackathon_Learning_Roadmap.svg";
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
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

                    {/* AI Flow Summary */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold text-sm uppercase tracking-wider">
                            <Sparkles className="w-4 h-4" /> The Learning Flow
                        </div>

                        <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/5 relative">
                            {loading ? (
                                <div className="flex flex-col items-center py-6 text-zinc-500 italic">
                                    <Loader2 className="w-6 h-6 animate-spin mb-4 text-blue-500" />
                                    Synthesizing your journey...
                                </div>
                            ) : (
                                <p className="text-zinc-200 text-base leading-relaxed font-medium italic italic-quote">
                                    &quot;{summary}&quot;
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Mermaid Visual Roadmap */}
                    {!loading && flowchart && (
                        <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10 flex flex-col items-center">
                            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider mb-4 w-full text-left">Your Roadmap</p>
                            <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                                <MermaidRender chart={flowchart} />
                            </div>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex flex-col gap-3">
                        {!loading && flowchart && (
                            <button
                                onClick={handleDownload}
                                className="w-full bg-zinc-800 hover:bg-zinc-700 border border-white/10 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                Download Map
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

// Sub-component wrapper to manually instantiate Mermaid on the strictly-rendered string
function MermaidRender({ chart }: { chart: string }) {
    useEffect(() => {
        import('mermaid').then(mermaid => {
            mermaid.default.initialize({
                startOnLoad: true,
                theme: 'dark',
                securityLevel: 'loose',
                fontFamily: 'Inter, sans-serif'
            });
            mermaid.default.run();
        });
    }, [chart]);

    return <div className="mermaid text-center w-full min-h-[150px]">{chart}</div>;
}
