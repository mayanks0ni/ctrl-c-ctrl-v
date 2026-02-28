"use client";

import { useState, useEffect } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc, updateDoc, increment, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { Loader2, Send, MessageSquare, ArrowLeft, Users, ArrowBigUp, ArrowBigDown, MessageCircle, MoreVertical, Edit2, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

interface Post {
    id: string;
    text: string;
    userId: string;
    userName: string;
    subject: string;
    createdAt: any;
    likes: number; // For backward compatibility
    upvotes?: number;
    downvotes?: number;
    replyCount?: number;
    votedBy?: { [userId: string]: 'up' | 'down' };
}

interface Reply {
    id: string;
    text: string;
    userId: string;
    userName: string;
    createdAt: any;
}

export default function ForumPage() {
    const router = useRouter();
    const { user, loading } = useRequireAuth();
    const [activeSubject, setActiveSubject] = useState<string>("General");
    const [subjects, setSubjects] = useState<string[]>(["General"]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
    const [replies, setReplies] = useState<Reply[]>([]);
    const [newPost, setNewPost] = useState("");
    const [newReply, setNewReply] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [userName, setUserName] = useState("Learner");

    const [editingId, setEditingId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");
    const [showOptionsId, setShowOptionsId] = useState<string | null>(null);

    const activeThread = posts.find(p => p.id === activeThreadId) || null;

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

    // Listen to Replies for Active Thread
    useEffect(() => {
        if (!activeThreadId) {
            setReplies([]);
            return;
        }

        const q = query(
            collection(db, `forumPosts/${activeThreadId}/replies`),
            orderBy("createdAt", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const repliesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Reply[];
            setReplies(repliesData);
        });

        return () => unsubscribe();
    }, [activeThreadId]);

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
                upvotes: 0,
                downvotes: 0,
                replyCount: 0,
                votedBy: {}
            });
            setNewPost("");
        } catch (error) {
            console.error("Error posting to forum:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReplySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReply.trim() || !user || !activeThreadId) return;

        setIsSubmitting(true);
        try {
            const repliesRef = collection(db, `forumPosts/${activeThreadId}/replies`);
            await addDoc(repliesRef, {
                text: newReply.trim(),
                userId: user.uid,
                userName,
                createdAt: serverTimestamp()
            });

            // Update reply count on original post
            const postRef = doc(db, "forumPosts", activeThreadId);
            await updateDoc(postRef, {
                replyCount: increment(1)
            });

            // Send notification to post author
            if (activeThread && activeThread.userId !== user.uid) {
                const notifRef = collection(db, `users/${activeThread.userId}/notifications`);
                await addDoc(notifRef, {
                    type: 'reply',
                    fromUserId: user.uid,
                    fromUserName: userName,
                    message: `${userName} replied to your post in ${activeThread.subject}.`,
                    link: `/forum?threadId=${activeThreadId}`,
                    isRead: false,
                    createdAt: serverTimestamp()
                });
            }

            setNewReply("");
        } catch (error) {
            console.error("Error replying:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVote = async (postId: string, type: 'up' | 'down') => {
        if (!user) return;
        const postRef = doc(db, "forumPosts", postId);
        const post = posts.find(p => p.id === postId);
        if (!post) return;

        const votedBy = { ...(post.votedBy || {}) };
        const currentVote = votedBy[user.uid];

        let upvoteChange = 0;
        let downvoteChange = 0;

        if (currentVote === type) {
            // Remove vote
            if (type === 'up') upvoteChange = -1;
            else downvoteChange = -1;
            delete votedBy[user.uid];
        } else {
            // Change or add vote
            if (currentVote) {
                // Switching from up to down or vice versa
                if (currentVote === 'up') {
                    upvoteChange = -1;
                    downvoteChange = 1;
                } else {
                    upvoteChange = 1;
                    downvoteChange = -1;
                }
            } else {
                // New vote
                if (type === 'up') upvoteChange = 1;
                else downvoteChange = 1;
            }
            votedBy[user.uid] = type;
        }

        try {
            await updateDoc(postRef, {
                upvotes: increment(upvoteChange),
                downvotes: increment(downvoteChange),
                votedBy: votedBy
            });
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    const handleDeletePost = async (postId: string) => {
        if (!confirm("Delete this post?")) return;
        try {
            await deleteDoc(doc(db, "forumPosts", postId));
            if (activeThreadId === postId) setActiveThreadId(null);
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdatePost = async (postId: string) => {
        if (!editText.trim()) return;
        try {
            await updateDoc(doc(db, "forumPosts", postId), {
                text: editText.trim()
            });
            setEditingId(null);
            setEditText("");
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteReply = async (replyId: string) => {
        if (!confirm("Delete this reply?") || !activeThreadId) return;
        try {
            await deleteDoc(doc(db, "forumPosts", activeThreadId, "replies", replyId));
            await updateDoc(doc(db, "forumPosts", activeThreadId), {
                replyCount: increment(-1)
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleUpdateReply = async (replyId: string) => {
        if (!editText.trim() || !activeThreadId) return;
        try {
            await updateDoc(doc(db, "forumPosts", activeThreadId, "replies", replyId), {
                text: editText.trim()
            });
            setEditingId(null);
            setEditText("");
        } catch (error) {
            console.error(error);
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
            <div className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800 p-4 lg:pl-24">
                <div className="max-w-3xl mx-auto flex items-center gap-4">
                    <button
                        onClick={() => activeThreadId ? setActiveThreadId(null) : router.push("/feed")}
                        className="w-10 h-10 bg-zinc-900 border border-zinc-700/50 rounded-full flex items-center justify-center text-white hover:bg-zinc-800 transition shrink-0"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1">
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-400" /> {activeThreadId ? "Discussion" : "Community"}
                        </h1>
                    </div>
                </div>

                {!activeThreadId && (
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
                )}
            </div>

            {/* Main Content */}
            <div className="flex-1 max-w-3xl w-full mx-auto p-4 lg:pl-24 pb-32 space-y-4 overflow-y-auto">
                <AnimatePresence mode="wait">
                    {!activeThreadId ? (
                        <motion.div
                            key="feed"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            {posts.length === 0 ? (
                                <div className="text-center py-20 text-zinc-500">
                                    <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                    <p>No discussions in {activeSubject} yet.</p>
                                    <p className="text-sm">Be the first to start one!</p>
                                </div>
                            ) : (
                                posts.map(post => {
                                    const userVote = post.votedBy?.[user.uid];
                                    const isEditing = editingId === post.id;

                                    return (
                                        <div
                                            key={post.id}
                                            className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700 transition relative"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <Link href={`/profile?id=${post.userId}`} className="flex items-center gap-3 group">
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold text-sm group-hover:scale-110 transition">
                                                        {post.userName.charAt(0).toUpperCase()}
                                                    </div>
                                                    <p className="font-bold text-zinc-200 group-hover:text-blue-400 transition">{post.userName}</p>
                                                </Link>

                                                {post.userId === user.uid && (
                                                    <div className="relative">
                                                        <button
                                                            onClick={() => setShowOptionsId(showOptionsId === post.id ? null : post.id)}
                                                            className="p-1 text-zinc-500 hover:text-white transition"
                                                        >
                                                            <MoreVertical className="w-4 h-4" />
                                                        </button>
                                                        {showOptionsId === post.id && (
                                                            <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-10 w-32">
                                                                <button
                                                                    onClick={() => { setEditingId(post.id); setEditText(post.text); setShowOptionsId(null); }}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" /> Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => { handleDeletePost(post.id); setShowOptionsId(null); }}
                                                                    className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 text-red-500 flex items-center gap-2 font-bold"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {isEditing ? (
                                                <div className="mb-4">
                                                    <textarea
                                                        value={editText}
                                                        onChange={(e) => setEditText(e.target.value)}
                                                        className="w-full bg-zinc-800 border border-blue-500 rounded-xl p-3 text-white focus:outline-none mb-2"
                                                        rows={3}
                                                    />
                                                    <div className="flex gap-2">
                                                        <button onClick={() => handleUpdatePost(post.id)} className="px-3 py-1.5 bg-blue-600 rounded-lg text-xs font-bold">Save</button>
                                                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-zinc-800 rounded-lg text-xs font-bold hover:bg-zinc-700">Cancel</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <p className="text-zinc-300 leading-relaxed break-words mb-4">{post.text}</p>
                                            )}

                                            <div className="flex items-center gap-6 pt-2 border-t border-zinc-800/50">
                                                <div className="flex items-center gap-2 bg-zinc-800/50 rounded-lg p-1">
                                                    <button
                                                        onClick={() => handleVote(post.id, 'up')}
                                                        className={`p-1.5 rounded-md transition ${userVote === 'up' ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        <ArrowBigUp className="w-5 h-5 fill-current" />
                                                    </button>
                                                    <span className="text-xs font-bold text-zinc-400 min-w-[1ch] text-center">
                                                        {(post.upvotes || 0) - (post.downvotes || 0)}
                                                    </span>
                                                    <button
                                                        onClick={() => handleVote(post.id, 'down')}
                                                        className={`p-1.5 rounded-md transition ${userVote === 'down' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                                    >
                                                        <ArrowBigDown className="w-5 h-5 fill-current" />
                                                    </button>
                                                </div>

                                                <button
                                                    onClick={() => setActiveThreadId(post.id)}
                                                    className="flex items-center gap-2 text-zinc-500 hover:text-zinc-300 transition text-sm font-medium"
                                                >
                                                    <MessageCircle className="w-5 h-5" />
                                                    {post.replyCount || 0} Replies
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </motion.div>
                    ) : activeThread ? (
                        <motion.div
                            key="thread"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-6"
                        >
                            {/* Original Post */}
                            <div className="bg-zinc-900 border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_20px_rgba(37,99,235,0.1)] relative">
                                <div className="flex items-center justify-between mb-4">
                                    <Link href={`/profile?id=${activeThread.userId}`} className="flex items-center gap-3 group">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-bold group-hover:scale-110 transition">
                                            {activeThread.userName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-lg group-hover:text-blue-400 transition">{activeThread.userName}</p>
                                            <p className="text-xs text-blue-400 font-bold uppercase tracking-wider">{activeThread.subject}</p>
                                        </div>
                                    </Link>

                                    {activeThread.userId === user.uid && (
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowOptionsId(showOptionsId === activeThread.id ? null : activeThread.id)}
                                                className="p-1 text-zinc-500 hover:text-white transition"
                                            >
                                                <MoreVertical className="w-5 h-5" />
                                            </button>
                                            {showOptionsId === activeThread.id && (
                                                <div className="absolute right-0 top-full mt-2 bg-zinc-900 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl z-10 w-32">
                                                    <button
                                                        onClick={() => { setEditingId(activeThread.id); setEditText(activeThread.text); setShowOptionsId(null); }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 flex items-center gap-2"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => { handleDeletePost(activeThread.id); setShowOptionsId(null); }}
                                                        className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-800 text-red-500 flex items-center gap-2 font-bold"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" /> Delete
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {editingId === activeThread.id ? (
                                    <div className="mb-6">
                                        <textarea
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="w-full bg-zinc-800 border border-blue-500 rounded-xl p-4 text-white focus:outline-none mb-2"
                                            rows={3}
                                        />
                                        <div className="flex gap-2">
                                            <button onClick={() => handleUpdatePost(activeThread.id)} className="px-4 py-2 bg-blue-600 rounded-lg text-sm font-bold">Save</button>
                                            <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-zinc-800 rounded-lg text-sm font-bold hover:bg-zinc-700">Cancel</button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-zinc-200 text-lg leading-relaxed mb-6">{activeThread.text}</p>
                                )}

                                <div className="flex items-center gap-6">
                                    <div className="flex items-center gap-2 bg-zinc-800/80 rounded-xl p-1.5">
                                        <button
                                            onClick={() => handleVote(activeThread.id, 'up')}
                                            className={`p-2 rounded-lg transition ${activeThread.votedBy?.[user.uid] === 'up' ? 'text-blue-500 bg-blue-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <ArrowBigUp className="w-6 h-6 fill-current" />
                                        </button>
                                        <span className="text-sm font-bold text-zinc-300 min-w-[1ch] text-center">
                                            {(activeThread.upvotes || 0) - (activeThread.downvotes || 0)}
                                        </span>
                                        <button
                                            onClick={() => handleVote(activeThread.id, 'down')}
                                            className={`p-2 rounded-lg transition ${activeThread.votedBy?.[user.uid] === 'down' ? 'text-red-500 bg-red-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            <ArrowBigDown className="w-6 h-6 fill-current" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Replies List */}
                            <div className="space-y-4 pl-4 border-l-2 border-zinc-800">
                                <h4 className="text-zinc-500 text-sm font-bold uppercase tracking-widest pl-2">Replies</h4>
                                {replies.length === 0 ? (
                                    <p className="text-zinc-600 text-sm pl-2">No replies yet.</p>
                                ) : (
                                    replies.map(reply => {
                                        const isEditingReply = editingId === reply.id;
                                        return (
                                            <div key={reply.id} className="bg-zinc-900/40 border border-zinc-800/50 rounded-xl p-4 relative group">
                                                <div className="flex items-center justify-between mb-2">
                                                    <Link href={`/profile?id=${reply.userId}`} className="flex items-center gap-2 hover:text-blue-400 transition">
                                                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-[10px]">
                                                            {reply.userName.charAt(0).toUpperCase()}
                                                        </div>
                                                        <p className="font-bold text-zinc-300 text-xs">{reply.userName}</p>
                                                    </Link>

                                                    {reply.userId === user.uid && !isEditingReply && (
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                                                            <button onClick={() => { setEditingId(reply.id); setEditText(reply.text); }} className="p-1 hover:text-blue-400 transition"><Edit2 className="w-3 h-3" /></button>
                                                            <button onClick={() => handleDeleteReply(reply.id)} className="p-1 hover:text-red-500 transition"><Trash2 className="w-3 h-3" /></button>
                                                        </div>
                                                    )}
                                                </div>

                                                {isEditingReply ? (
                                                    <div>
                                                        <textarea
                                                            value={editText}
                                                            onChange={(e) => setEditText(e.target.value)}
                                                            className="w-full bg-zinc-800 border border-blue-500 rounded-lg p-2 text-sm text-white focus:outline-none mb-2"
                                                        />
                                                        <div className="flex gap-2">
                                                            <button onClick={() => handleUpdateReply(reply.id)} className="px-2 py-1 bg-blue-600 rounded text-[10px] font-bold">Save</button>
                                                            <button onClick={() => setEditingId(null)} className="px-2 py-1 bg-zinc-800 rounded text-[10px] font-bold hover:bg-zinc-700">Cancel</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-zinc-400 text-sm leading-relaxed">{reply.text}</p>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    ) : null}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="fixed bottom-0 w-full bg-black/80 backdrop-blur-xl border-t border-zinc-800 p-4 z-40">
                <div className="max-w-3xl mx-auto">
                    {!activeThreadId ? (
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
                    ) : (
                        <form onSubmit={handleReplySubmit} className="flex gap-2">
                            <input
                                type="text"
                                value={newReply}
                                onChange={(e) => setNewReply(e.target.value)}
                                placeholder={activeThread ? `Reply to ${activeThread.userName}...` : "Loading..."}
                                className="flex-1 bg-zinc-900 border border-zinc-800 rounded-full px-6 py-4 text-white placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            <button
                                type="submit"
                                disabled={!newReply.trim() || isSubmitting}
                                className="w-14 h-14 bg-blue-600 rounded-full flex flex-shrink-0 items-center justify-center text-white hover:bg-blue-500 transition disabled:opacity-50 disabled:bg-zinc-800"
                            >
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 mr-1 mt-1" />}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}
