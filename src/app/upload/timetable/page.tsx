"use client";

import { useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRouter } from "next/navigation";
import { doc, collection, addDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion, AnimatePresence } from "framer-motion";
import { UploadCloud, FileText, Loader2, CheckCircle2, ChevronRight, AlertCircle, Calendar, ArrowLeft } from "lucide-react";

export default function TimetableUploadPage() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const [file, setFile] = useState<File | null>(null);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
    const [errorMessage, setErrorMessage] = useState("");

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
            if (validTypes.includes(selectedFile.type)) {
                setFile(selectedFile);
                setStatus("idle");
            } else {
                setStatus("error");
                setErrorMessage("Please upload a PDF or an Image (PNG/JPG).");
            }
        }
    };

    const handleUpload = async () => {
        if (!file || !user) return;

        setStatus("analyzing"); // Transition straight to analysis as the bypass upload is instant
        setProgress(0);

        try {
            console.log("Starting DIRECT upload bypass (v1.0.5). User:", user.uid, "File:", file.name);

            const formData = new FormData();
            formData.append("file", file);
            formData.append("userId", user.uid);

            const analyzeRes = await fetch(`/api/analyze-timetable?t=${Date.now()}`, {
                method: "POST",
                body: formData,
            });

            if (!analyzeRes.ok) {
                const rawText = await analyzeRes.text().catch(() => "");
                console.error("DEBUG [v1.1.2]: Status", analyzeRes.status, "Raw Body:", rawText);

                let errorData: any = {};
                try { errorData = JSON.parse(rawText); } catch (e) { }

                if (rawText.toLowerCase().includes("quota") || analyzeRes.status === 429) {
                    throw new Error(`AI Daily Quota Exceeded. Switched to Backup (v1.1.2: ${errorData.active_model || 'Lite'}). Please Hard Refresh and try again!`);
                }

                throw new Error(errorData.message || errorData.error || `Server Error (${analyzeRes.status})`);
            }

            console.log("Direct analysis complete!");
            setStatus("success");
            setTimeout(() => router.push("/profile"), 2000);

        } catch (error: any) {
            console.error("Direct Upload Error:", error);
            setStatus("error");
            setErrorMessage(error.message || "An unexpected error occurred during analysis.");
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative">
            <div className="absolute top-0 w-full h-96 bg-gradient-to-b from-purple-900/40 to-transparent pointer-events-none" />
            <div className="absolute bottom-4 right-4 text-[10px] text-zinc-800 font-mono">v1.1.2 (Lite Bypass Active)</div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-xl z-10 bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-[3rem] p-10 shadow-2xl"
            >
                <div className="flex justify-between items-start mb-8">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition shadow-lg"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center text-purple-400">
                        <Calendar className="w-8 h-8" />
                    </div>
                    <div className="w-10" /> {/* Spacer */}
                </div>

                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold mb-3 tracking-tight">Focus Assistant</h1>
                    <p className="text-zinc-400">Upload your schedule to get focus interventions and instant study material during class hours!</p>
                    <p className="text-[10px] text-purple-400 mt-2 font-mono uppercase tracking-widest animate-pulse">Running on Lite AI (v1.1.2)</p>
                </div>

                {/* Upload Dropzone */}
                {!file && (
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-zinc-700/50 rounded-3xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all cursor-pointer group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <UploadCloud className="w-10 h-10 text-zinc-500 mb-4 group-hover:text-purple-400 transition-colors" />
                            <p className="mb-2 text-sm text-zinc-400"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                            <p className="text-xs text-zinc-500">PDF, PNG, JPG (MAX. 5MB)</p>
                        </div>
                        <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileChange} />
                    </label>
                )}

                {/* File Selected State */}
                {file && status === "idle" && (
                    <div className="bg-zinc-800/50 rounded-2xl p-4 flex items-center justify-between border border-zinc-700/50">
                        <div className="flex items-center gap-4 overflow-hidden">
                            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 shrink-0">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="min-w-0">
                                <p className="font-medium text-white truncate">{file.name}</p>
                                <p className="text-xs text-zinc-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setFile(null)}
                            className="text-zinc-400 hover:text-white text-sm px-3 py-1 rounded-lg hover:bg-zinc-700 transition"
                        >
                            Change
                        </button>
                    </div>
                )}

                {/* Status Indicators */}
                <AnimatePresence mode="wait">
                    {status === "uploading" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-8 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-zinc-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin text-purple-400" /> Uploading...</span>
                                <span className="font-medium">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full bg-zinc-800 rounded-full h-2 overflow-hidden border border-zinc-700/30">
                                <div className="bg-purple-500 h-2 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(168,85,247,0.5)]" style={{ width: `${progress}%` }}></div>
                            </div>
                        </motion.div>
                    )}

                    {status === "analyzing" && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="mt-8 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6 text-center">
                            <Loader2 className="w-10 h-10 text-blue-400 mx-auto mb-3 animate-spin" />
                            <p className="font-bold text-white text-lg">Analyzing Schedule...</p>
                            <p className="text-sm text-zinc-400">Gemini is extracting your class timings...</p>
                        </motion.div>
                    )}

                    {status === "success" && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-8 bg-green-500/10 border border-green-500/20 rounded-2xl p-6 text-center">
                            <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto mb-3" />
                            <p className="font-bold text-white text-lg">Schedule Synced!</p>
                            <p className="text-sm text-zinc-400">Interventions active. Returning to profile...</p>
                        </motion.div>
                    )}

                    {status === "error" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-400">{errorMessage}</p>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Action Button */}
                {status === "idle" && file && (
                    <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        onClick={handleUpload}
                        className="w-full mt-8 bg-purple-600 text-white font-bold text-lg rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-purple-500 transition-all shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.4)]"
                    >
                        Sync Schedule <ChevronRight className="w-5 h-5" />
                    </motion.button>
                )}
            </motion.div>
        </div>
    );
}

