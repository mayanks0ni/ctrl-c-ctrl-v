"use client";

import { useEffect, useState, Suspense } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { doc, getDoc, collection, getDocs, orderBy, query, limit, where, onSnapshot } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";
import { signOut } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Zap, Flame, Trophy, LogOut, FileText, ArrowLeft, UserPlus, Check, X, Users, Bell, Calendar, ChevronRight } from "lucide-react";
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
    const [unreadNotifs, setUnreadNotifs] = useState(0);
    const [isRequestSent, setIsRequestSent] = useState(false);
    const [loading, setLoading] = useState(true);
    const [leaderboard, setLeaderboard] = useState<{ id: string; displayName: string; xp: number }[]>([]);
    const [fetchingLeaderboard, setFetchingLeaderboard] = useState(true);

    const [timetable, setTimetable] = useState<any>(null);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) return;
            const uidToFetch = targetUid || user.uid;

            try {
                // Listen to notifications if own profile
                if (isOwnProfile) {
                    const notifRef = collection(db, `users/${user.uid}/notifications`);
                    const q = query(notifRef, where("isRead", "==", false));
                    onSnapshot(q, (snapshot) => {
                        setUnreadNotifs(snapshot.size);
                    });
                }

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

                // Fetch timetable
                const timetableSnap = await getDoc(doc(db, `users/${uidToFetch}/metadata`, "timetable"));
                if (timetableSnap.exists()) {
                    setTimetable(timetableSnap.data());
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

        const fetchLeaderboard = async () => {
            try {
                setFetchingLeaderboard(true);
                const usersRef = collection(db, "users");
                const q = query(usersRef, orderBy("xp", "desc"), limit(50));
                const snapshot = await getDocs(q);
                const leaderboardData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    displayName: doc.data().displayName || "Anonymous Learner",
                    xp: doc.data().xp || 0
                }));
                setLeaderboard(leaderboardData);
            } catch (error) {
                console.error("Failed to fetch leaderboard:", error);
            } finally {
                setFetchingLeaderboard(false);
            }
        };

        if (user && !authLoading) {
            fetchProfile();
            fetchLeaderboard();
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

            <div className="max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Column: Profile Info & Stats */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-7 xl:col-span-8 flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <button onClick={() => router.back()} className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                            {isOwnProfile ? "My Profile" : "User Profile"}
                        </h1>
                        {isOwnProfile ? (
                            <div className="flex gap-2">
                                <Link href="/profile/notifications" className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition relative">
                                    <Bell className="w-5 h-5" />
                                    {unreadNotifs > 0 && (
                                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center text-[10px] font-bold ring-2 ring-zinc-950 animate-pulse">
                                            {unreadNotifs}
                                        </span>
                                    )}
                                </Link>
                                <button onClick={handleSignOut} className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 hover:bg-red-500/20 transition">
                                    <LogOut className="w-5 h-5" />
                                </button>
                            </div>
                        ) : (
                            <div className="w-10" />
                        )}
                    </div>

                    {/* User Info & Level Card */}
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
                                                    <Link href={`/profile?id=${req.from}`} className="flex items-center gap-3 hover:opacity-80 transition group">
                                                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center font-bold text-sm group-hover:scale-105 transition">
                                                            {req.fromName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <p className="font-bold text-sm group-hover:text-blue-400 transition">{req.fromName}</p>
                                                    </Link>
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

                    {/* Timetable Section */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-4 px-2">
                            <h3 className="text-sm font-bold tracking-widest text-zinc-500 uppercase">
                                {isOwnProfile ? "Your Timetable" : `${stats.displayName}'s Timetable`}
                            </h3>
                            {isOwnProfile && (
                                <Link href="/upload/timetable" className="text-sm font-bold text-purple-400 hover:text-purple-300 transition flex items-center gap-1">
                                    {timetable ? "Update" : "Upload"} +
                                </Link>
                            )}
                        </div>
                        {timetable ? (
                            <Link
                                href={timetable.fileUrl}
                                target="_blank"
                                className="group relative bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl flex items-center gap-4 hover:border-purple-500/50 hover:bg-purple-500/5 transition-all overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/0 via-purple-500/5 to-purple-500/0 -translate-x-full group-hover:animate-shimmer" />
                                <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 shrink-0 shadow-lg">
                                    <Calendar className="w-6 h-6" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-zinc-100 truncate group-hover:text-purple-300 transition">{timetable.fileName}</p>
                                    <p className="text-xs text-zinc-500 mt-0.5">Click to view schedule • {timetable.fileType?.includes('pdf') ? 'PDF' : 'Image'}</p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-600 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                            </Link>
                        ) : (
                            <div className="bg-zinc-900/30 border border-dashed border-zinc-800/80 rounded-3xl p-8 text-center">
                                <Calendar className="w-8 h-8 text-zinc-700 mx-auto mb-3 opacity-20" />
                                <p className="text-sm text-zinc-600 italic">No timetable shared yet.</p>
                                {isOwnProfile && (
                                    <Link href="/upload/timetable" className="inline-block mt-4 text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-4 py-2 rounded-xl transition">
                                        Upload Now
                                    </Link>
                                )}
                            </div>
                        )}
                    </div>

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

                            <div className="space-y-3 mb-8 lg:mb-0">
                                {documents.length === 0 ? (
                                    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-6 text-center text-zinc-500">
                                        No documents uploaded yet.
                                    </div>
                                ) : (
                                    documents.map(doc => (
                                        <motion.div whileHover={{ scale: 1.01 }} key={doc.id} className="cursor-pointer bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 flex items-center gap-4 hover:bg-zinc-800/50 transition">
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
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </motion.div>

                {/* Right Column: Leaderboards */}
                <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-5 xl:col-span-4 flex flex-col gap-6">
                    {/* Reusable Leaderboard Section Generator */}
                    {(() => {
                        const renderLeaderboardCard = (title: string, subtitle: string, data: any[], isLoading: boolean = false, emptyMsg: string = "") => (
                            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-[2rem] p-6 backdrop-blur-xl shadow-2xl flex-col flex h-fit max-h-[450px]">
                                <div className="flex items-center gap-3 mb-6 shrink-0">
                                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-yellow-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                                        <Trophy className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
                                        <p className="text-sm text-zinc-400 font-medium">{subtitle}</p>
                                    </div>
                                </div>

                                <div className="space-y-3 overflow-y-auto pr-2 pb-2 custom-scrollbar">
                                    {isLoading ? (
                                        <div className="bg-zinc-800/20 border border-zinc-800/50 rounded-2xl p-8 flex justify-center items-center">
                                            <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
                                        </div>
                                    ) : data.length === 0 ? (
                                        <div className="bg-zinc-800/20 border border-zinc-800/50 rounded-2xl p-6 text-center text-zinc-500 text-sm">
                                            {emptyMsg}
                                        </div>
                                    ) : (
                                        data.map((userStats, index) => {
                                            const isCurrentUser = userStats.id === user?.uid;
                                            const levelCalculated = Math.floor(userStats.xp / 100) + 1;
                                            let rankDisplay: React.ReactNode = <span className="font-bold text-zinc-400">{index + 1}</span>;
                                            let rankBg = "bg-zinc-800/50 border-zinc-700/50";

                                            if (index === 0) {
                                                rankDisplay = <span className="text-xl">👑</span>;
                                                rankBg = "bg-yellow-500/20 border-yellow-500/50 ring-2 ring-yellow-500/20 shadow-[0_0_15px_rgba(234,179,8,0.3)] animate-pulse-slow";
                                            } else if (index === 1) {
                                                rankDisplay = <span className="text-xl">🥈</span>;
                                                rankBg = "bg-zinc-300/20 border-zinc-300/50 ring-1 ring-zinc-300/50";
                                            } else if (index === 2) {
                                                rankDisplay = <span className="text-xl">🥉</span>;
                                                rankBg = "bg-orange-600/20 border-orange-500/50 ring-1 ring-orange-500/50";
                                            }

                                            return (
                                                <motion.div
                                                    key={userStats.id}
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: index * 0.05 }}
                                                    whileHover={{ scale: 1.02, x: 4 }}
                                                    className={`relative border rounded-2xl p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer overflow-hidden group
                                                        ${isCurrentUser
                                                            ? 'bg-blue-600/20 border-blue-400/50 shadow-lg shadow-blue-500/10 ring-1 ring-blue-400/30'
                                                            : 'bg-zinc-950/50 border-zinc-800/50 hover:bg-zinc-800/50'
                                                        }`}
                                                    onClick={() => router.push(`/profile?id=${userStats.id}`)}
                                                >
                                                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:animate-shimmer" />
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${rankBg}`}>
                                                        {rankDisplay}
                                                    </div>
                                                    <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-full flex items-center justify-center text-lg font-black text-white shrink-0 shadow-inner">
                                                        {userStats.displayName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className={`font-bold text-sm truncate ${isCurrentUser ? 'text-blue-300' : 'text-zinc-200'}`}>
                                                            {userStats.displayName} {isCurrentUser && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full ml-1">You</span>}
                                                        </p>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-zinc-800 px-1.5 py-0.5 rounded-md">
                                                                Lvl {levelCalculated}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-right shrink-0 pr-1">
                                                        <p className={`font-black tracking-tight text-lg leading-none ${isCurrentUser ? 'text-blue-400' : 'text-white'}`}>
                                                            {userStats.xp}
                                                        </p>
                                                        <p className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase mt-1">XP</p>
                                                    </div>
                                                </motion.div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );

                        // Comrades Data
                        const comradesRankings = stats ? [
                            { id: user!.uid, displayName: stats.displayName, xp: stats.xp },
                            ...comrades.map(c => ({ id: c.uid, displayName: c.displayName || 'Learner', xp: c.xp || 0 }))
                        ].sort((a, b) => b.xp - a.xp) : [];

                        return (
                            <>
                                {renderLeaderboardCard(
                                    "Global rankings",
                                    "Top learners worldwide",
                                    leaderboard,
                                    fetchingLeaderboard,
                                    "No global data available."
                                )}

                                {renderLeaderboardCard(
                                    "Comrades Rankings",
                                    "Compare with friends",
                                    comradesRankings,
                                    false,
                                    "Add some comrades in the forum to see how you stack up!"
                                )}
                            </>
                        );
                    })()}
                </motion.div>
            </div>
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
