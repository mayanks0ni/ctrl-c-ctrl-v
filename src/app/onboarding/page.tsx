"use client";

import { useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useRouter } from "next/navigation";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { motion } from "framer-motion";
import { Check, Loader2, BookOpen, GraduationCap, Calculator, Globe, Code, Microscope } from "lucide-react";

const SUGGESTED_SUBJECTS = [
    { id: "cs", name: "Computer Science", icon: Code },
    { id: "math", name: "Mathematics", icon: Calculator },
    { id: "physics", name: "Physics", icon: Globe },
    { id: "bio", name: "Biology", icon: Microscope },
    { id: "lit", name: "Literature", icon: BookOpen },
    { id: "history", name: "History", icon: GraduationCap },
];

type SubjectDifficulty = "beginner" | "intermediate" | "advanced";

interface SelectedSubject {
    name: string;
    difficulty: SubjectDifficulty;
}

export default function OnboardingPage() {
    const { user, loading } = useRequireAuth();
    const router = useRouter();
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedSubjects, setSelectedSubjects] = useState<SelectedSubject[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [progressStatus, setProgressStatus] = useState("");

    if (loading || !user) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const toggleSubject = (subjectName: string) => {
        setSelectedSubjects(prev => {
            const exists = prev.find(s => s.name === subjectName);
            if (exists) {
                return prev.filter(s => s.name !== subjectName);
            }
            return [...prev, { name: subjectName, difficulty: "beginner" }];
        });
    };

    const setDifficulty = (subjectName: string, difficulty: SubjectDifficulty) => {
        setSelectedSubjects(prev =>
            prev.map(s => s.name === subjectName ? { ...s, difficulty } : s)
        );
    };

    const handleContinue = async () => {
        if (selectedSubjects.length === 0) return;

        if (step === 1) {
            setStep(2);
            return;
        }

        setIsSaving(true);
        try {
            const userRef = doc(db, "users", user.uid);
            await updateDoc(userRef, {
                subjects: selectedSubjects,
                onboardingComplete: true
            });

            // Pre-generate feeds for each subject sequentially
            for (const subject of selectedSubjects) {
                setProgressStatus(`Curating your ${subject.name} feed...`);
                await fetch("/api/generate-feed", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        userId: user.uid,
                        subject: subject.name,
                        expertiseLevel: subject.difficulty
                    }),
                });
            }

            router.push("/feed");
        } catch (error) {
            console.error("Error saving subjects:", error);
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl z-10"
            >
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold mb-4 tracking-tight">
                        {step === 1 ? "What are you studying?" : "Set your expertise level"}
                    </h1>
                    <p className="text-zinc-400 text-lg">
                        {step === 1
                            ? "Select your subjects to personalize your learning feed."
                            : "How familiar are you with these subjects?"}
                    </p>
                </div>

                {step === 1 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-10">
                        {SUGGESTED_SUBJECTS.map((subject) => {
                            const isSelected = selectedSubjects.some(s => s.name === subject.name);
                            const Icon = subject.icon;

                            return (
                                <motion.button
                                    key={subject.id}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => toggleSubject(subject.name)}
                                    className={`relative p-6 rounded-2xl border flex flex-col items-center justify-center gap-4 transition-all duration-200 ${isSelected
                                        ? "bg-blue-500/10 border-blue-500/50 text-white"
                                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:bg-zinc-800/50"
                                        }`}
                                >
                                    {isSelected && (
                                        <div className="absolute top-3 right-3 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-white" />
                                        </div>
                                    )}
                                    <Icon className={`w-8 h-8 ${isSelected ? "text-blue-400" : "text-zinc-500"}`} />
                                    <span className="font-medium">{subject.name}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                ) : (
                    <div className="space-y-6 mb-10">
                        {selectedSubjects.map((subject) => (
                            <div key={subject.name} className="bg-zinc-900/50 border border-zinc-800 p-5 rounded-2xl">
                                <h3 className="text-xl font-bold mb-4">{subject.name}</h3>
                                <div className="grid grid-cols-3 gap-3">
                                    {(["beginner", "intermediate", "advanced"] as SubjectDifficulty[]).map((level) => (
                                        <button
                                            key={level}
                                            onClick={() => setDifficulty(subject.name, level)}
                                            className={`p-3 rounded-xl border text-sm font-medium capitalize transition-all duration-200 ${subject.difficulty === level
                                                    ? "bg-purple-500/20 border-purple-500 text-purple-300"
                                                    : "bg-black/40 border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <div className="flex flex-col items-center">
                    <button
                        onClick={handleContinue}
                        disabled={selectedSubjects.length === 0 || isSaving}
                        className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg flex items-center gap-2 hover:bg-zinc-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(255,255,255,0.2)]"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-6 h-6 animate-spin" />
                                {progressStatus || "Personalizing..."}
                            </>
                        ) : (
                            step === 1 ? "Next: Set Difficulty" : "Generate My Feed"
                        )}
                    </button>

                    {step === 2 && !isSaving && (
                        <button onClick={() => setStep(1)} className="mt-4 text-zinc-500 hover:text-white transition">
                            Back to Subjects
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
