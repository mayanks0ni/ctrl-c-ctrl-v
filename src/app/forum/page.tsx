"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, Send, MessageSquare, ArrowLeft, Users } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Post {
    id: string;
    text: string;
    userId: string;
    userName: string;
    subject: string;
    createdAt: any;
    likes: number;
}

export default function ForumPage() {
    const { user, loading } = useRequireAuth();
    const [activeSubject, setActiveSubject] = useState<string>("General");
    const [subjects, setSubjects] = useState<string[]>(["General"]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [newPost, setNewPost] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userName, setUserName] = useState("Learner");

    // Fetch User Subjects
    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists()) {
                    const userData = docSnap.data();
                    if (userData.subjects?.length > 0) {
                        const subjectNames = userData.subjects.map((s: any) =>
                            typeof s === "string" ? s : s.name
                        );
                        setSubjects(["General", ...subjectNames]);
                    }
                    if (userData.displayName) setUserName(userData.displayName);
                }
            });
        }
    }, [user]);

    // Listen to Posts
    useEffect(() => {
        const q = query(
            collection(db, "forumPosts"),
            orderBy("createdAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const postsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Post[];

            // Filter client-side for MVP
            setPosts(postsData.filter(p => p.subject === activeSubject));
        });

        return () => unsubscribe();
    }, [activeSubject]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPost.trim() || !user) return;

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "forumPosts"), {
                text: newPost.trim(),
                userId: user.uid,
                userName,
                subject: activeSubject,
                createdAt: serverTimestamp(),
                likes: 0
            });
            setNewPost("");
        } catch (error) {
            console.error("Error posting to forum:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-zinc-950">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-zinc-950 text-white flex flex-col relative">
            {/* Background decoration */}
            <div className="fixed top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 blur-[120px] rounded-full point-events-none" />

            {/* Header */}
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800 p-4">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <Link href="/feed" className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" /> Community
                        </h1>
                    </div>
                </div>

                {/* Subject Filter */}
                <div className="max-w-3xl mx-auto mt-4 overflow-x-auto no-scrollbar flex gap-2 pb-2">
                    {subjects.map(subj => (
                        <button
                            key={subj}
                            onClick={() => setActiveSubject(subj)}
                            className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${activeSubject === subj
                                ? 'bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]'
                                : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:bg-zinc-800'
                                }`}
                        >
                            {subj}
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Feed */}
            <div className="flex-1 max-w-3xl w-full mx-auto p-4 pb-32 space-y-4">
                <AnimatePresence>
                    {posts.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20 text-zinc-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                            <p>No discussions in {activeSubject} yet.</p>
                            <p className="text-sm">Be the first to start one!</p>
                        </motion.div>
                    ) : (
                        posts.map(post => (
                            <motion.div
                                key={post.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition"
                            >
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm">
                                        {post.userName.charAt(0).toUpperCase()}
                                    </div>
                                    <p className="font-bold text-zinc-200">{post.userName}</p>
                                </div>
                                <p className="text-zinc-300 leading-relaxed break-words">{post.text}</p>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="fixed bottom-0 w-full bg-black/80 backdrop-blur-xl border-t border-zinc-800 p-4 z-40">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="flex gap-2">
                        <input
                            type="text"
                            value={newPost}
                            onChange={(e) => setNewPost(e.target.value)}
                            placeholder={`Ask something about ${activeSubject}...`}
                            maxLength={280}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-6 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                        />
                        <button
                            type="submit"
                            disabled={!newPost.trim() || isSubmitting}
                            className="w-14 h-14 bg-blue-600 rounded-full flex flex-shrink-0 items-center justify-center text-white hover:bg-blue-500 transition disabled:opacity-50 disabled:bg-zinc-800"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-1 mt-1" />}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
