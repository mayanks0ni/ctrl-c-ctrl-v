"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, Zap, BookOpen, Share2, Heart, MessageCircle, Send, X } from "lucide-react";
import { doc, updateDoc, increment, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

// --- Types ---
type BaseItem = { id: string; type: string; topic: string; likes?: number; comments?: number; shares?: number; likedBy?: string[]; };
export type SummaryItem = BaseItem & { type: "summary"; title: string; points: string[]; };
export type PostItem = BaseItem & { type: "post"; hook: string; content: string; };
export type VisualItem = BaseItem & { type: "visual_concept"; title: string; analogy: string; explanation: string; };
export type QuizItem = BaseItem & { type: "quiz"; question: string; options: string[]; correctIndex: number; explanation: string; };
export type FeedItemType = SummaryItem | PostItem | VisualItem | QuizItem;

interface Props {
    item: FeedItemType;
    userId: string;
}

// --- Component: Comments Modal ---
const CommentsModal = ({ feedId, userId, onClose }: { feedId: string, userId: string, onClose: () => void }) => {
    const [comments, setComments] = useState<any[]>([]);
    const [newComment, setNewComment] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const q = query(
            collection(db, `feeds/${feedId}/comments`),
            orderBy("createdAt", "desc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [feedId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newComment.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            // 1. Add comment to subcollection
            await addDoc(collection(db, `feeds/${feedId}/comments`), {
                text: newComment.trim(),
                userId,
                createdAt: serverTimestamp()
            });
            // 2. Increment comments count on feed doc
            await updateDoc(doc(db, "feeds", feedId), {
                comments: increment(1)
            });
            setNewComment("");
        } catch (error) {
            console.error("Failed to post comment", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute inset-x-0 bottom-0 top-[30%] bg-zinc-900 rounded-t-3xl border-t border-zinc-700 shadow-2xl z-50 flex flex-col"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                <h3 className="text-lg font-bold text-white">Comments</h3>
                <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full bg-zinc-800"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {comments.length === 0 ? (
                    <div className="text-zinc-500 text-center mt-10">No comments yet. Be the first!</div>
                ) : (
                    comments.map(c => (
                        <div key={c.id} className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase">
                                {c.userId?.substring(0, 2) || "AN"}
                            </div>
                            <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none w-full">
                                <p className="text-white text-sm">{c.text}</p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 flex gap-2">
                <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="bg-zinc-800 flex-1 rounded-full px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                    type="submit"
                    disabled={!newComment.trim() || isSubmitting}
                    className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-500 disabled:opacity-50 transition shrink-0"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </motion.div>
    );
};

// --- Common Engagement Bar ---
const EngagementBar = ({ item, userId }: { item: FeedItemType; userId: string }) => {
    const [showComments, setShowComments] = useState(false);
    const isLiked = item.likedBy?.includes(userId) || false;

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId || !item.id) return;
        const feedRef = doc(db, "feeds", item.id);

        if (isLiked) {
            await updateDoc(feedRef, {
                likes: increment(-1),
                likedBy: arrayRemove(userId)
            });
        } else {
            await updateDoc(feedRef, {
                likes: increment(1),
                likedBy: arrayUnion(userId)
            });
        }
    };

    const handleShare = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId || !item.id) return;
        const feedRef = doc(db, "feeds", item.id);
        await updateDoc(feedRef, { shares: increment(1) });
    };

    return (
        <>
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-40">
                <button onClick={handleLike} className={`flex flex-col items-center gap-1 transition ${isLiked ? 'text-red-500' : 'text-white hover:text-red-400'}`}>
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-md rounded-full flex items-center justify-center">
                        <Heart className="w-6 h-6" fill={isLiked ? "currentColor" : "none"} />
                    </div>
                    <span className="text-xs font-medium">{item.likes || 0}</span>
                </button>
                <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-md rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium">{item.comments || 0}</span>
                </button>
                <button onClick={handleShare} className="flex flex-col items-center gap-1 text-white hover:text-green-400 transition">
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-md rounded-full flex items-center justify-center">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium">{item.shares || 0}</span>
                </button>
            </div>

            <AnimatePresence>
                {showComments && (
                    <CommentsModal
                        feedId={item.id}
                        userId={userId}
                        onClose={() => setShowComments(false)}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

// --- Component: Post Card ---
export const PostCard = ({ item, userId }: Props) => (
    <div className="w-full h-full flex items-end pb-24 px-6 relative bg-gradient-to-br from-zinc-900 to-black">
        <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay" />
        <div className="relative z-10 max-w-[85%]">
            <div className="bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold rounded-full w-fit mb-4 text-white uppercase tracking-wider">
                Micro-Lesson
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{(item as PostItem).hook}</h2>
            <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-medium">{(item as PostItem).content}</p>
        </div>
        <EngagementBar item={item} userId={userId} />
    </div>
);

// --- Component: Summary Flip Card ---
export const SummaryCard = ({ item, userId }: Props) => {
    const summaryItem = item as SummaryItem;
    const [flipped, setFlipped] = useState(false);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-zinc-950 relative" onClick={() => setFlipped(!flipped)}>
            <div className="perspective-1000 w-full max-w-sm h-[60vh]">
                <motion.div
                    animate={{ rotateY: flipped ? 180 : 0 }}
                    transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                    className="w-full h-full relative preserve-3d cursor-pointer"
                >
                    {/* Front */}
                    <motion.div
                        initial={false}
                        animate={{ opacity: flipped ? 0 : 1 }}
                        transition={{ duration: 0.3 }}
                        style={{ backfaceVisibility: "hidden" }}
                        className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl border border-white/10"
                    >
                        <BookOpen className="w-16 h-16 text-white/50 mb-6" />
                        <h2 className="text-3xl font-bold text-white mb-4">{summaryItem.title}</h2>
                        <p className="text-blue-100/80 font-medium">Tap to reveal key takeaways</p>
                    </motion.div>

                    {/* Back */}
                    <motion.div
                        initial={false}
                        animate={{ opacity: flipped ? 1 : 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                        className="absolute inset-0 bg-zinc-900 rounded-3xl p-8 flex flex-col justify-center border border-zinc-700 shadow-2xl overflow-y-auto"
                    >
                        <h3 className="text-xl font-bold text-zinc-100 mb-6 pb-4 border-b border-zinc-800">{summaryItem.title} Key Points</h3>
                        <ul className="space-y-4">
                            {summaryItem.points.map((point, idx) => (
                                <li key={idx} className="flex items-start gap-4">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm font-bold mt-0.5">{idx + 1}</span>
                                    <span className="text-zinc-300 text-lg leading-relaxed">{point}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </motion.div>
            </div>
            <EngagementBar item={item} userId={userId} />
        </div>
    );
};

// --- Component: Visual Concept Card --- //
export const VisualCard = ({ item, userId }: Props) => (
    <div className="w-full h-full flex flex-col justify-end pb-24 px-6 bg-zinc-950 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-purple-600/20 blur-[150px] rounded-full point-events-none" />
        <div className="relative z-10 max-w-[85%] bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><Lightbulb className="w-6 h-6" /></div>
                <h2 className="text-2xl font-bold text-white">{(item as VisualItem).title}</h2>
            </div>
            <blockquote className="text-2xl font-medium text-white mb-6 leading-relaxed border-l-4 border-purple-500 pl-6 italic">
                &quot;{(item as VisualItem).analogy}&quot;
            </blockquote>
            <p className="text-zinc-400 text-lg leading-relaxed">{(item as VisualItem).explanation}</p>
        </div>
        <EngagementBar item={item} userId={userId} />
    </div>
);

// --- Component: Interactive Quiz Card ---
export const QuizCard = ({ item, userId }: Props) => {
    const quizItem = item as QuizItem;
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);

    const handleSelect = async (index: number) => {
        if (answered) return;
        setSelected(index);
        setAnswered(true);

        const isCorrect = index === quizItem.correctIndex;
        if (isCorrect && userId) {
            // Award XP
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { xp: increment(10) });
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-center px-6 bg-zinc-950 relative">
            <div className="absolute top-12 left-6 bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-4 py-1.5 rounded-full flex items-center gap-2 font-bold text-sm tracking-wide">
                <Zap className="w-4 h-4" /> KNOWLEDGE CHECK
            </div>

            <div className="max-w-[90%] md:max-w-md w-full mx-auto relative z-10">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-8 leading-tight">{quizItem.question}</h2>

                <div className="space-y-4">
                    {quizItem.options.map((option, idx) => {
                        let btnClass = "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800";
                        let Icon = null;

                        if (answered) {
                            if (idx === quizItem.correctIndex) {
                                btnClass = "bg-green-500/20 border-green-500 text-green-100";
                                Icon = CheckCircle2;
                            } else if (idx === selected) {
                                btnClass = "bg-red-500/20 border-red-500 text-red-100";
                                Icon = XCircle;
                            } else {
                                btnClass = "bg-zinc-900/50 border-zinc-800/50 text-zinc-600";
                            }
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleSelect(idx)}
                                disabled={answered}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all duration-300 flex items-center justify-between group ${btnClass}`}
                            >
                                <span className="font-medium text-lg pr-4">{option}</span>
                                {Icon && <Icon className="w-6 h-6 shrink-0" />}
                            </button>
                        );
                    })}
                </div>

                <AnimatePresence>
                    {answered && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`mt-8 p-5 rounded-2xl border-l-4 ${selected === quizItem.correctIndex ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'}`}
                        >
                            <h4 className={`font-bold mb-2 ${selected === quizItem.correctIndex ? 'text-green-400' : 'text-red-400'}`}>
                                {selected === quizItem.correctIndex ? 'Correct! +10 XP' : 'Not quite!'}
                            </h4>
                            <p className="text-zinc-300 leading-relaxed">{quizItem.explanation}</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <EngagementBar item={item} userId={userId} />
        </div>
    );
};
