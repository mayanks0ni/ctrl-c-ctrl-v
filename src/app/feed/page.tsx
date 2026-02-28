"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import FeedScroller from "@/components/feed/FeedScroller";
import { Loader2, User, Plus, LayoutGrid, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

function getInitials(name: string) {
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
        return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function NavButton({ href, icon, initials, label, isActive, onClick }: { href?: string, icon?: React.ReactNode, initials?: string, label: string, isActive?: boolean, onClick?: () => void }) {
    const inner = (
        <div className={`group flex items-center rounded-full border backdrop-blur-md transition-colors duration-300 cursor-pointer overflow-hidden h-12 shadow-[0_0_15px_rgba(0,0,0,0.3)] ${isActive ? 'bg-white text-black border-white' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center font-bold">
                {icon || initials}
            </div>
            <div className="grid grid-cols-[0fr] group-hover:grid-cols-[1fr] transition-[grid-template-columns] duration-300 ease-out">
                <div className="overflow-hidden whitespace-nowrap">
                    <span className="font-semibold pr-5 block opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">{label}</span>
                </div>
            </div>
        </div>
    );

    if (href) return <Link href={href} className="pointer-events-auto block w-fit">{inner}</Link>;
    return <button onClick={onClick} className="pointer-events-auto block outline-none text-left w-fit">{inner}</button>;
}

interface SelectedSubject {
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
}

export default function FeedPage() {
    const { user, loading } = useRequireAuth();
    const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
    const [activeSubject, setActiveSubject] = useState<SelectedSubject | undefined>(undefined);

    useEffect(() => {
        if (user) {
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists() && docSnap.data().subjects) {
                    const rawSubjects = docSnap.data().subjects;
                    // Normalize subjects in case they are still strings from the old schema
                    const normalizedSubjects = rawSubjects.map((s: SelectedSubject | string) => {
                        if (typeof s === "string") {
                            return { name: s, difficulty: "beginner" } as SelectedSubject;
                        }
                        return s;
                    });
                    setSubjects(normalizedSubjects);
                }
            });
        }
    }, [user]);

    if (loading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
            {/* Left Sidebar Navigation Overlay */}
            <div className="absolute left-0 top-0 h-full z-50 pointer-events-none flex flex-col justify-center">
                {/* Subtle gradient to ensure sidebar visibility over video content */}
                <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-black/80 to-transparent -z-10 pointer-events-none" />

                <div className="flex flex-col justify-center gap-3 items-start pointer-events-auto max-h-full overflow-y-auto no-scrollbar py-8 pl-4 pr-12 w-fit">
                    <NavButton href="/profile" icon={<User className="w-5 h-5" />} label="Profile" />
                    <NavButton href="/forum" icon={<Users className="w-5 h-5" />} label="Forums" />
                    <NavButton href="/upload" icon={<Plus className="w-5 h-5" />} label="Upload" />

                    <div className="w-6 h-px bg-white/20 my-2 ml-3 shrink-0" />

                    <NavButton
                        isActive={!activeSubject}
                        onClick={() => setActiveSubject(undefined)}
                        initials="FY"
                        label="For You"
                    />
                    {subjects.map(subj => (
                        <NavButton
                            key={subj.name}
                            isActive={activeSubject?.name === subj.name}
                            onClick={() => setActiveSubject(subj)}
                            initials={getInitials(subj.name)}
                            label={subj.name}
                        />
                    ))}
                </div>
            </div>

            {/* The Scroller */}
            <FeedScroller userId={user.uid} subject={activeSubject?.name} difficulty={activeSubject?.difficulty} />
        </div>
    );
}
