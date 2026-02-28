"use client";

import { useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, writeBatch, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, ArrowLeft, MessageSquare, UserPlus, Bell, CheckCircle2, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

interface Notification {
    id: string;
    type: 'reply' | 'comrade_request';
    fromUserId: string;
    fromUserName: string;
    message: string;
    link: string;
    isRead: boolean;
    createdAt: any;
    requestId?: string;
}

export default function NotificationsPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useRequireAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const notifRef = collection(db, `users/${user.uid}/notifications`);
        const q = query(notifRef, orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Notification[];
            setNotifications(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const markAsRead = async (id: string) => {
        const docRef = doc(db, `users/${user!.uid}/notifications`, id);
        await updateDoc(docRef, { isRead: true });
    };

    const markAllAsRead = async () => {
        const batch = writeBatch(db);
        notifications.filter(n => !n.isRead).forEach(n => {
            const docRef = doc(db, `users/${user!.uid}/notifications`, n.id);
            batch.update(docRef, { isRead: true });
        });
        await batch.commit();
    };

    const deleteNotification = async (id: string) => {
        // We'll just filter locally for now if using onSnapshot, 
        // but for real persistence we'd call deleteDoc
        const { deleteDoc } = await import("firebase/firestore");
        await deleteDoc(doc(db, `users/${user!.uid}/notifications`, id));
    };

    if (authLoading || loading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="min-h-screen bg-zinc-950 text-white p-6 pb-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-[120px] rounded-full point-events-none" />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-xl mx-auto relative z-10"
            >
                <div className="flex justify-between items-center mb-8">
                    <button
                        onClick={() => router.back()}
                        className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-xl font-bold flex items-center gap-2">
                        <Bell className="w-5 h-5 text-blue-400" /> Notifications
                        {unreadCount > 0 && (
                            <span className="bg-blue-600 text-[10px] px-2 py-0.5 rounded-full ring-2 ring-zinc-950">
                                {unreadCount}
                            </span>
                        )}
                    </h1>
                    {unreadCount > 0 ? (
                        <button
                            onClick={markAllAsRead}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition flex items-center gap-1"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark all read
                        </button>
                    ) : (
                        <div className="w-10" />
                    )}
                </div>

                <div className="space-y-3">
                    {notifications.length === 0 ? (
                        <div className="py-20 text-center text-zinc-600">
                            <Bell className="w-12 h-12 mx-auto mb-4 opacity-10" />
                            <p className="font-medium">All caught up!</p>
                            <p className="text-sm">New notifications will appear here.</p>
                        </div>
                    ) : (
                        <AnimatePresence initial={false}>
                            {notifications.map(n => (
                                <motion.div
                                    key={n.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className={`relative group bg-zinc-900/50 border ${n.isRead ? 'border-zinc-800/50' : 'border-blue-500/30 bg-blue-500/5'} rounded-2xl p-4 transition-all`}
                                >
                                    <div className="flex gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${n.type === 'reply' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                            {n.type === 'reply' ? <MessageSquare className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-8">
                                            <div className={`text-sm leading-relaxed ${n.isRead ? 'text-zinc-400' : 'text-zinc-100'}`}>
                                                <Link href={`/profile?id=${n.fromUserId}`} className="font-bold hover:text-blue-400 transition">
                                                    {n.fromUserName}
                                                </Link>
                                                {" "}
                                                <span className={n.isRead ? 'text-zinc-500' : 'text-zinc-300'}>
                                                    {n.type === 'reply' ? 'replied to your post' : 'sent you a comrade request'}
                                                </span>
                                                {n.type === 'reply' && n.message.includes(' in ') && (
                                                    <span className="text-zinc-500 italic">
                                                        {n.message.split('replied to your post')[1]}
                                                    </span>
                                                )}
                                                {n.type === 'comrade_request' && n.message.includes(' studying ') && (
                                                    <span className="text-zinc-500 italic">
                                                        {n.message.split(n.fromUserName)[1]?.replace(' sent you a comrade request.', '')}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-zinc-500 mt-2 font-bold uppercase tracking-widest">
                                                {n.createdAt?.toDate().toLocaleDateString(undefined, {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>

                                            <div className="mt-3 flex gap-2">
                                                {n.type === 'comrade_request' && n.requestId ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                const { acceptFriendRequest } = await import("@/lib/social");
                                                                await acceptFriendRequest(n.requestId!, n.fromUserId, user!.uid);
                                                                await markAsRead(n.id);
                                                                // Local feedback: maybe remove or update message
                                                            }}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5 shadow-lg shadow-blue-600/20"
                                                        >
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                const { rejectFriendRequest } = await import("@/lib/social");
                                                                await rejectFriendRequest(n.requestId!);
                                                                await markAsRead(n.id);
                                                            }}
                                                            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5"
                                                        >
                                                            <X className="w-3.5 h-3.5" /> Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <Link
                                                        href={n.link}
                                                        onClick={() => markAsRead(n.id)}
                                                        className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-[10px] font-bold transition flex items-center gap-1.5"
                                                    >
                                                        View Details
                                                    </Link>
                                                )}
                                                {!n.isRead && n.type !== 'comrade_request' && (
                                                    <button
                                                        onClick={() => markAsRead(n.id)}
                                                        className="px-3 py-1.5 text-blue-400 hover:text-blue-300 text-[10px] font-bold transition"
                                                    >
                                                        Mark read
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => deleteNotification(n.id)}
                                            className="absolute top-4 right-4 p-1.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    {!n.isRead && (
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-500 rounded-full animate-pulse group-hover:hidden" />
                                    )}
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
