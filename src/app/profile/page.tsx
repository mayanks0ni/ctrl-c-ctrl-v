"use client";

import { useEffect, useState, Suspense } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doc, getDoc, collection, getDocs, orderBy, query, limit, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Zap, Flame, Trophy, LogOut, FileText, ArrowLeft, UserPlus, Check, X, Users } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { getPendingRequests, getComrades, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, FriendRequest } from "@/lib/social";

interface UserStats {
    uid: string;
    xp: number;
    streak: number;
    displayName: string;
    subjects: { name: string; difficulty: string }[];
    comrades?: string[];
}

function ProfileContent() {
    const { user, loading: authLoading } = useRequireAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const targetUid = searchParams.get("id");
    const isOwnProfile = !targetUid || targetUid === user?.uid;

    const [stats, setStats] = useState<UserStats | null>(null);
    const [documents, setDocuments] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
    const [comrades, setComrades] = useState<any[]>([]);
    const [isRequestSent, setIsRequestSent] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const uidToFetch = targetUid || user.uid;

            try {
                const docSnap = await getDoc(doc(db, "users", uidToFetch));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const normalizedSubjects = (data.subjects || []).map((s: any) =>
                        typeof s === "string" ? { name: s, difficulty: "beginner" } : s
                    );
                    setStats({ uid: uidToFetch, ...data, subjects: normalizedSubjects } as UserStats);

                    // Check if request already sent
                    if (!isOwnProfile) {
                        const q = query(collection(db, "friendRequests"),
                            where("from", "==", user.uid),
                            where("to", "==", uidToFetch),
                            where("status", "==", "pending")
                        );
                        const snap = await getDocs(q);
                        setIsRequestSent(!snap.empty);
                    }
                }

                // Only fetch private data if own profile
                if (isOwnProfile) {
                    const docsRef = collection(db, `users/${user.uid}/documents`);
                    const q = query(docsRef, orderBy("uploadedAt", "desc"), limit(5));
                    const querySnapshot = await getDocs(q);
                    setDocuments(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() })));

                    const requests = await getPendingRequests(user.uid);
                    setPendingRequests(requests);

                    const comradeList = await getComrades(user.uid);
                    setComrades(comradeList);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        if (user && !authLoading) {
            fetchProfile();
        }
    }, [user, authLoading, targetUid, isOwnProfile]);

    const handleSignOut = async () => {
        await signOut(auth);
        router.push("/");
    };

    const handleAddComrade = async () => {
        if (!user || !stats || !targetUid) return;
        await sendFriendRequest(user.uid, user.displayName || "Learner", targetUid);
        setIsRequestSent(true);
    };

    const handleAccept = async (req: FriendRequest) => {
        await acceptFriendRequest(req.id, req.from, user!.uid);
        setPendingRequests(prev => prev.filter(r => r.id !== req.id));
        const newComrades = await getComrades(user!.uid);
        setComrades(newComrades);
    };

    const handleReject = async (requestId: string) => {
        await rejectFriendRequest(requestId);
        setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    };

    if (authLoading || loading || !stats) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const level = Math.floor(stats.xp / 100) + 1;
    const progressToNextLevel = stats.xp % 100;
    const isAlreadyComrade = stats.comrades?.includes(user?.uid || "") || comrades.some(c => c.uid === targetUid);

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/20 blur-[100px] rounded-full" />
            <div className="absolute top-40 left-0 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full" />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-8">
                    <button onClick={() => router.back()} className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                        {isOwnProfile ? "My Profile" : "User Profile"}
                    </h1>
                    {isOwnProfile ? (
                        <button onClick={handleSignOut} className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition">
                            <LogOut className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>

                <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-[2rem] p-8 mb-6 shadow-2xl relative overflow-hidden">
                    <div className="flex items-center gap-6 mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center text-3xl font-bold shadow-lg shadow-purple-500/20 ring-4 ring-zinc-950">
                            {stats.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                            <h2 className="text-3xl font-bold mb-1">{stats.displayName}</h2>
                            <p className="text-zinc-400 font-medium tracking-wide text-sm">{isOwnProfile ? user?.email : "Community Member"}</p>
                        </div>
                        {!isOwnProfile && (
                            <button
                                onClick={handleAddComrade}
                                disabled={isRequestSent || isAlreadyComrade}
                                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 ${isAlreadyComrade ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                        isRequestSent ? 'bg-zinc-800 text-zinc-500 cursor-default' :
                                            'bg-blue-600 text-white hover:bg-blue-500 active:scale-95'
                                    }`}
                            >
                                {isAlreadyComrade ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                {isAlreadyComrade ? "Comrade" : isRequestSent ? "Sent" : "Add"}
                            </button>
                        )}
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
                            <motion.div initial={{ width: 0 }} animate={{ width: `${progressToNextLevel}%` }} className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative">
                                <div className="absolute inset-0 bg-white/20 w-full animate-pulse" />
                            </motion.div>
                        </div>
                    </div>
                </div>

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

                {isOwnProfile && (
                    <>
                        {/* Pending Requests */}
                        <AnimatePresence>
                            {pendingRequests.length > 0 && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-8 overflow-hidden">
                                    <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4 px-2">Pending Comrade Requests</h3>
                                    <div className="space-y-2">
                                        {pendingRequests.map(req => (
                                            <div key={req.id} className="bg-blue-600/10 border border-blue-500/20 rounded-2xl p-4 flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm">
                                                        {req.fromName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="font-bold text-sm">{req.fromName}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleAccept(req)} className="p-2 bg-blue-600 rounded-xl hover:bg-blue-500 transition"><Check className="w-4 h-4" /></button>
                                                    <button onClick={() => handleReject(req.id)} className="p-2 bg-zinc-800 rounded-xl hover:bg-zinc-700 transition"><X className="w-4 h-4" /></button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Comrades List */}
                        <div className="mb-8">
                            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase mb-4 px-2">Comrades</h3>
                            {comrades.length === 0 ? (
                                <p className="text-sm text-zinc-600 px-2 italic">Connect with others in the forum to add comrades!</p>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    {comrades.map(c => (
                                        <Link href={`/profile?id=${c.uid}`} key={c.uid} className="bg-zinc-900/50 border border-zinc-800 p-3 rounded-2xl flex items-center gap-3 hover:bg-zinc-800 transition">
                                            <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-xs ring-1 ring-zinc-700">
                                                {c.displayName?.charAt(0).toUpperCase() || "L"}
                                            </div>
                                            <p className="font-bold text-xs truncate">{c.displayName || "Learner"}</p>
                                        </Link>
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}

                <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">{isOwnProfile ? "Your Subjects" : `${stats.displayName}'s Subjects`}</h3>
                    {isOwnProfile && <Link href="/onboarding" className="text-sm font-bold text-blue-400 hover:text-blue-300 transition">Edit Subjects</Link>}
                </div>
                <div className="flex flex-wrap gap-2 mb-8 px-2">
                    {stats.subjects.map((sub: any) => {
                        const subjectName = typeof sub === 'string' ? sub : sub.name;
                        return (
                            <div key={subjectName} className="bg-zinc-900/50 border border-zinc-800 px-4 py-2.5 rounded-xl flex items-center gap-3">
                                <span className="text-sm font-bold text-zinc-100">{subjectName}</span>
                                {typeof sub === 'object' && sub.difficulty && (
                                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-500 border border-zinc-700">
                                        {sub.difficulty}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isOwnProfile && (
                    <>
                        <div className="flex justify-between items-end mb-4 px-2">
                            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">Recent Uploads</h3>
                            <Link href="/upload" className="text-sm font-bold text-blue-400 hover:text-blue-300 transition">Upload +</Link>
                        </div>
                        <div className="space-y-3">
                            {documents.length === 0 ? (
                                <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 text-center text-zinc-500">No documents uploaded yet.</div>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition">
                                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400 shrink-0"><FileText className="w-5 h-5" /></div>
                                        <div className="min-w-0 flex-1">
                                            <p className="font-medium text-sm truncate">{doc.fileName}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-2 h-2 rounded-full ${doc.status === 'processed' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                <p className="text-xs text-zinc-500 capitalize">{doc.status}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center bg-zinc-950"><Loader2 className="w-8 h-8 text-blue-500 animate-spin" /></div>}>
            <ProfileContent />
        </Suspense>
    );
}
