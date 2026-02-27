"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doc, getDoc, collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { Loader2, Zap, Flame, Trophy, LogOut, FileText, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface UserStats {
    xp: number;
    streak: number;
    displayName: string;
    subjects: { name: string; difficulty: string }[];
}

export default function ProfilePage() {
    const { user, loading } = useRequireAuth();
    const router = useRouter();
    const [stats, setStats] = useState<UserStats | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            const fetchProfile = async () => {
                const docSnap = await getDoc(doc(db, "users", user.uid));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    // Normalize subjects in case they are still strings
                    const normalizedSubjects = (data.subjects || []).map((s: any) =>
                        typeof s === "string" ? { name: s, difficulty: "beginner" } : s
                    );
                    setStats({ ...data, subjects: normalizedSubjects } as UserStats);
                }

                const docsRef = collection(db, `users/${user.uid}/documents`);
                const q = query(docsRef, orderBy("uploadedAt", "desc"), limit(5));
                const querySnapshot = await getDocs(q);
                const docsData = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
                setDocuments(docsData);
            };
            fetchProfile();
        }
    }, [user]);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/");
    };

    if (loading || !stats) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    // Calculate Level (100 XP per level for MVP)
    const level = Math.floor(stats.xp / 100) + 1;
    const progressToNextLevel = stats.xp % 100;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
            <div className="absolute top-40 left-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto relative z-10">
                {/* Header */}
                <div className="flex justify-between items-center mb-8">
                    <Link href="/feed" className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">Profile</h1>
                    <button onClick={handleSignOut} className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition">
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* User Info & Level Card */}
                <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-[2rem] p-8 mb-6 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-purple-500/20 ring-4 ring-zinc-950">
                            {stats.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h2 className="text-3xl font-bold mb-1">{stats.displayName}</h2>
                            <p className="text-zinc-400 font-medium tracking-wide text-sm">{user?.email}</p>
                        </div>
                    </div>

                    <div className="bg-black/40 rounded-2xl p-5 border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                            <div>
                                <p className="text-sm font-bold text-blue-400 uppercase tracking-widest mb-1">Current Level</p>
                                <p className="text-4xl font-black">Lvl {level}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm font-medium text-zinc-400">{progressToNextLevel} / 100 XP to Next</p>
                            </div>
                        </div>
                        <div className="h-4 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${progressToNextLevel}%` }}
                                className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative"
                            >
                                <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                            </motion.div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center text-orange-400 mb-3">
                            <Flame className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.streak}</p>
                        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Day Streak</p>
                    </div>
                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-2xl flex items-center justify-center text-yellow-400 mb-3">
                            <Trophy className="w-6 h-6" />
                        </div>
                        <p className="text-3xl font-bold text-white mb-1">{stats.xp}</p>
                        <p className="text-xs font-bold tracking-widest text-zinc-500 uppercase">Total XP</p>
                    </div>
                </div>

                {/* Subjects */}
                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Your Subjects</h3>
                    <Link href="/onboarding" className="text-sm font-bold text-blue-400 hover:text-blue-300 transition">Edit Subjects</Link>
                </div>
                <div className="flex flex-wrap gap-2 mb-8 px-2">
                    {stats.subjects.map(sub => (
                        <div key={sub.name} className="bg-zinc-900/50 border border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
                            <span className="text-sm font-bold text-zinc-100">{sub.name}</span>
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700">
                                {sub.difficulty}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Recent Documents */}
                <div className="flex justify-between items-end mb-4 px-2">
                    <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Recent Uploads</h3>
                    <Link href="/upload" className="text-sm font-bold text-blue-400 hover:text-blue-300 transition">Upload +</Link>
                </div>

                <div className="space-y-3">
                    {documents.length === 0 ? (
                        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 text-center text-zinc-500">
                            No documents uploaded yet.
                        </div>
                    ) : (
                        documents.map(doc => (
                            <div key={doc.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0">
                                    <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="font-medium text-sm truncate">{doc.fileName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`w-2 h-2 rounded-full ${doc.status === 'processed' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                                        <p className="text-xs text-zinc-500 capitalize">{doc.status}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </motion.div>
        </div>
    );
}
