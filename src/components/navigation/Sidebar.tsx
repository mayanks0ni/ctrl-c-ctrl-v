"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { User, Plus, Users, Loader2 } from "lucide-react";
import Link from "next/link";

interface SelectedSubject {
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
}

function getInitials(name: string) {
    const words = name.trim().split(/\s+/);
    if (words.length > 1) {
        return (words[0][0] + (words[1]?.[0] || "")).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

function NavButton({
    href,
    icon,
    initials,
    label,
    isActive,
    onClick
}: {
    href?: string,
    icon?: React.ReactNode,
    initials?: string,
    label: string,
    isActive?: boolean,
    onClick?: () => void
}) {
    const inner = (
        <div className={`group flex items-center rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer overflow-hidden h-12 shadow-[0_0_15px_rgba(0,0,0,0.3)] ${isActive ? 'bg-white text-black border-white scale-105' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
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

export default function Sidebar() {
    const { user, loading } = useAuth();
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    const [subjects, setSubjects] = useState<SelectedSubject[]>([]);
    const [fetching, setFetching] = useState(false);

    const activeSubjectName = searchParams.get("subject");

    useEffect(() => {
        if (user) {
            setFetching(true);
            getDoc(doc(db, "users", user.uid)).then(docSnap => {
                if (docSnap.exists() && docSnap.data().subjects) {
                    const rawSubjects = docSnap.data().subjects;
                    const normalizedSubjects = rawSubjects.map((s: SelectedSubject | string) => {
                        if (typeof s === "string") {
                            return { name: s, difficulty: "beginner" } as SelectedSubject;
                        }
                        return s;
                    });
                    setSubjects(normalizedSubjects);
                }
            }).finally(() => setFetching(false));
        }
    }, [user]);

    // Don't show sidebar on auth or onboarding pages
    if (pathname === "/auth" || pathname === "/onboarding" || pathname === "/") return null;
    if (loading || !user) return null;

    const handleSubjectClick = (name?: string) => {
        if (pathname !== "/feed") {
            const url = name ? `/feed?subject=${encodeURIComponent(name)}` : "/feed";
            router.push(url);
        } else {
            // If already on feed, just update search params
            const params = new URLSearchParams(searchParams.toString());
            if (name) {
                params.set("subject", name);
            } else {
                params.delete("subject");
            }
            router.push(`${pathname}?${params.toString()}`);
        }
    };

    return (
        <div className="fixed left-0 top-0 h-full z-[100] pointer-events-none flex flex-col justify-center">
            <div className="absolute left-0 top-0 w-32 h-full bg-gradient-to-r from-black/80 to-transparent -z-10 pointer-events-none" />

            <div className="flex flex-col justify-center gap-3 items-start pointer-events-auto max-h-full overflow-y-auto no-scrollbar py-8 pl-4 pr-12 w-fit">
                <NavButton
                    href="/profile"
                    icon={<User className="w-5 h-5" />}
                    label="Profile"
                    isActive={pathname === "/profile"}
                />
                <NavButton
                    href="/forum"
                    icon={<Users className="w-5 h-5" />}
                    label="Forums"
                    isActive={pathname === "/forum"}
                />
                <NavButton
                    href="/upload"
                    icon={<Plus className="w-5 h-5" />}
                    label="Upload"
                    isActive={pathname === "/upload"}
                />

                <div className="w-6 h-px bg-white/20 my-2 ml-3 shrink-0" />

                <NavButton
                    isActive={pathname === "/feed" && !activeSubjectName}
                    onClick={() => handleSubjectClick()}
                    initials="FY"
                    label="For You"
                />

                {fetching && (
                    <div className="ml-3 py-2">
                        <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />
                    </div>
                )}

                {subjects.map(subj => (
                    <NavButton
                        key={subj.name}
                        isActive={pathname === "/feed" && activeSubjectName === subj.name}
                        onClick={() => handleSubjectClick(subj.name)}
                        initials={getInitials(subj.name)}
                        label={subj.name}
                    />
                ))}
            </div>
        </div>
    );
}
