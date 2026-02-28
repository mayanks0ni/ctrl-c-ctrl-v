"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, Zap, BookOpen, MessageCircle, Send, X, ArrowBigUp, ArrowBigDown } from "lucide-react";
import { doc, updateDoc, increment, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, arrayUnion, arrayRemove, deleteField } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/config";

import Link from "next/link";

// --- Types ---
type BaseItem = { id: string; type: string; topic: string; subject?: string; upvotes?: number; downvotes?: number; comments?: number; votedBy?: { [userId: string]: 'up' | 'down' }; authorId?: string; authorName?: string; unsplashUrl?: string; };
export type SummaryItem = BaseItem & { type: "summary"; title: string; points: string[]; imageQuery?: string; };
export type PostItem = BaseItem & { type: "post"; hook: string; content: string; imageQuery?: string; };
export type VisualItem = BaseItem & { type: "visual_concept"; title: string; analogy: string; explanation: string; imageQuery?: string; };
export type QuizItem = BaseItem & { type: "quiz"; question: string; options: string[]; correctIndex: number; explanation: string; imageQuery?: string; };
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
            await addDoc(collection(db, `feeds/${feedId}/comments`), {
                text: newComment.trim(),
                userId,
                userName: auth.currentUser?.displayName || "Learner",
                createdAt: serverTimestamp()
            });
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
                            <Link href={`/profile?id=${c.userId}`} className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0 uppercase hover:bg-blue-500/40 transition">
                                {c.userName?.charAt(0) || c.userId?.substring(0, 1) || "A"}
                            </Link>
                            <div className="bg-zinc-800 p-3 rounded-2xl rounded-tl-none w-full group relative">
                                <Link href={`/profile?id=${c.userId}`} className="block text-[10px] font-bold text-blue-400/50 hover:text-blue-400 transition mb-1 uppercase tracking-wider">
                                    {c.userName || "Learner"}
                                </Link>
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

    // Optimistic local state for instant UI updates
    const [localUpcount, setLocalUpcount] = useState(item.upvotes || 0);
    const [localDowncount, setLocalDowncount] = useState(item.downvotes || 0);
    const [localVoteStatus, setLocalVoteStatus] = useState<'up' | 'down' | null>(item.votedBy?.[userId] || null);

    // Sync local state when server data arrives
    useEffect(() => {
        setLocalUpcount(item.upvotes || 0);
        setLocalDowncount(item.downvotes || 0);
        setLocalVoteStatus(item.votedBy?.[userId] || null);
    }, [item.upvotes, item.downvotes, item.votedBy, userId]);

    const handleVote = async (type: 'up' | 'down', e: React.MouseEvent) => {
        e.stopPropagation();
        if (!userId || !item.id) return;

        const currentVote = localVoteStatus;
        let upChange = 0;
        let downChange = 0;
        let newVote: 'up' | 'down' | null = type;

        if (currentVote === type) {
            if (type === 'up') upChange = -1;
            else downChange = -1;
            newVote = null;
        } else {
            if (type === 'up') {
                upChange = 1;
                if (currentVote === 'down') downChange = -1;
            } else {
                downChange = 1;
                if (currentVote === 'up') upChange = -1;
            }
        }

        // Optimistic update — instant UI feedback
        setLocalUpcount(prev => prev + upChange);
        setLocalDowncount(prev => prev + downChange);
        setLocalVoteStatus(newVote);

        // Persist to Firestore in the background
        const feedRef = doc(db, "feeds", item.id);
        const updates: any = {
            [`votedBy.${userId}`]: newVote === null ? deleteField() : newVote
        };
        if (upChange !== 0) updates.upvotes = increment(upChange);
        if (downChange !== 0) updates.downvotes = increment(downChange);

        try {
            await updateDoc(feedRef, updates);
        } catch (err) {
            // Revert on failure
            setLocalUpcount(prev => prev - upChange);
            setLocalDowncount(prev => prev - downChange);
            setLocalVoteStatus(currentVote);
            console.error("Vote failed:", err);
        }
    };

    return (
        <>
            <div className="absolute right-4 bottom-24 flex flex-col gap-6 items-center z-40">
                <div className="flex flex-col items-center gap-1">
                    <button
                        onClick={(e) => handleVote('up', e)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all bg-zinc-800/80 backdrop-blur-md border ${localVoteStatus === 'up' ? "text-orange-500 border-orange-500" : "text-white border-white/10 hover:text-orange-400"}`}
                    >
                        <ArrowBigUp className={`w-8 h-8 ${localVoteStatus === 'up' ? "fill-current" : ""}`} />
                    </button>
                    <span className="text-white text-xs font-bold drop-shadow-md">{localUpcount - localDowncount}</span>
                    <button
                        onClick={(e) => handleVote('down', e)}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all bg-zinc-800/80 backdrop-blur-md border ${localVoteStatus === 'down' ? "text-blue-500 border-blue-500" : "text-white border-white/10 hover:text-blue-400"}`}
                    >
                        <ArrowBigDown className={`w-6 h-6 ${localVoteStatus === 'down' ? "fill-current" : ""}`} />
                    </button>
                </div>

                <button onClick={(e) => { e.stopPropagation(); setShowComments(true); }} className="flex flex-col items-center gap-1 text-white hover:text-blue-400 transition">
                    <div className="w-12 h-12 bg-zinc-800/80 backdrop-blur-md rounded-full flex items-center justify-center">
                        <MessageCircle className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium">{item.comments || 0}</span>
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
export const PostCard = ({ item, userId }: Props) => {
    const post = item as PostItem;
    const imageUrl = post.unsplashUrl || ((post.imageQuery || post.topic)
        ? `https://loremflickr.com/800/1200/${encodeURIComponent(post.imageQuery || post.topic)}`
        : null);

    return (
        <div className="w-full h-full flex items-end pt-28 pb-24 pr-6 pl-24 md:pl-32 relative bg-zinc-950">
            {imageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent z-0" />
            <div className="absolute inset-0 bg-blue-500/5 mix-blend-overlay z-0" />

            <div className="relative z-10 max-w-[85%]">
                <div className="flex gap-2 mb-4">
                    <div className="bg-white/10 backdrop-blur-md px-3 py-1 text-xs font-semibold rounded-full text-white uppercase tracking-wider">
                        Micro-Lesson
                    </div>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 leading-tight">{post.hook}</h2>
                <p className="text-lg md:text-xl text-zinc-300 leading-relaxed font-medium">{post.content}</p>
            </div>
            <EngagementBar item={item} userId={userId} />
        </div>
    );
};

// --- Component: Summary Flip Card ---
export const SummaryCard = ({ item, userId }: Props) => {
    const summaryItem = item as SummaryItem;
    const [flipped, setFlipped] = useState(false);
    const imageUrl = summaryItem.unsplashUrl || ((summaryItem.imageQuery || summaryItem.topic)
        ? `https://loremflickr.com/800/1200/${encodeURIComponent(summaryItem.imageQuery || summaryItem.topic)}`
        : null);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center pt-28 pb-24 pr-6 pl-24 md:pl-32 bg-zinc-950 relative" onClick={() => setFlipped(!flipped)}>
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
                        className="absolute inset-0 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-2xl border border-white/10 overflow-hidden"
                    >
                        {imageUrl ? (
                            <div
                                className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40"
                                style={{ backgroundImage: `url(${imageUrl})` }}
                            />
                        ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-purple-700 opacity-80" />
                        )}
                        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

                        <div className="relative z-10 flex flex-col items-center">
                            <BookOpen className="w-16 h-16 text-white mb-6 drop-shadow-lg" />
                            <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">{summaryItem.title}</h2>
                            <p className="text-blue-100 font-medium drop-shadow-md">Tap to reveal key takeaways</p>
                        </div>
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
export const VisualCard = ({ item, userId }: Props) => {
    const visual = item as VisualItem;
    const imageUrl = visual.unsplashUrl || ((visual.imageQuery || visual.topic)
        ? `https://loremflickr.com/800/1200/${encodeURIComponent(visual.imageQuery || visual.topic)}`
        : null);

    return (
        <div className="w-full h-full flex flex-col justify-end pt-28 pb-24 pr-6 pl-24 md:pl-32 bg-zinc-950 relative overflow-hidden">
            {imageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent z-0" />
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[120%] h-[120%] bg-purple-600/20 blur-[150px] rounded-full point-events-none z-0" />

            <div className="relative z-10 max-w-[85%] bg-black/40 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400"><Lightbulb className="w-6 h-6" /></div>
                    <h2 className="text-2xl font-bold text-white">{visual.title}</h2>
                </div>
                <blockquote className="text-2xl font-medium text-white mb-6 leading-relaxed border-l-4 border-purple-500 pl-6 italic">
                    &quot;{visual.analogy}&quot;
                </blockquote>
                <p className="text-zinc-400 text-lg leading-relaxed">{visual.explanation}</p>
            </div>
            <EngagementBar item={item} userId={userId} />
        </div>
    );
};

// --- Component: Interactive Quiz Card ---
export const QuizCard = ({ item, userId }: Props) => {
    const quizItem = item as QuizItem;
    const [selected, setSelected] = useState<number | null>(null);
    const [answered, setAnswered] = useState(false);
    const imageUrl = quizItem.unsplashUrl || ((quizItem.imageQuery || quizItem.topic)
        ? `https://loremflickr.com/800/1200/${encodeURIComponent(quizItem.imageQuery || quizItem.topic)}`
        : null);

    const handleSelect = async (index: number) => {
        if (answered) return;
        setSelected(index);
        setAnswered(true);

        const isCorrect = index === quizItem.correctIndex;

        // Track engagement for spaced repetition and scaling
        fetch("/api/quiz-engagement", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                userId,
                feedId: quizItem.id,
                topic: quizItem.topic,
                isCorrect
            })
        }).catch(err => console.error("Failed to track quiz engagement:", err));

        if (isCorrect && userId) {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, { xp: increment(10) });
        }
    };

    return (
        <div className="w-full h-full flex flex-col justify-center pr-6 pl-24 md:pl-32 bg-zinc-950 relative overflow-hidden">
            {imageUrl && (
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-zinc-950/80 to-transparent z-0" />

            <div className="absolute top-28 left-6 flex items-center gap-2 z-10">
                <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 px-4 py-1.5 rounded-full flex items-center gap-2 font-bold text-sm tracking-wide">
                    <Zap className="w-4 h-4" /> KNOWLEDGE CHECK
                </div>
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
