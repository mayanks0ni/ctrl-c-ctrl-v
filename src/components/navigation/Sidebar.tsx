"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { User, NotebookPen, Zap, Loader2 } from "lucide-react";
import Link from "next/link";

interface SelectedSubject {
    name: string;
    difficulty: "beginner" | "intermediate" | "advanced";
}

function NavButton({
    href,
    icon,
    label,
    isActive,
    onClick
}: {
    href?: string,
    icon?: React.ReactNode,
    label: string,
    isActive?: boolean,
    onClick?: () => void
}) {
    const inner = (
        <div className={`group flex items-center rounded-full border backdrop-blur-md transition-all duration-300 cursor-pointer overflow-hidden h-12 shadow-[0_0_15px_rgba(0,0,0,0.3)] ${isActive ? 'bg-white text-black border-white scale-105' : 'bg-zinc-800/80 text-zinc-300 border-zinc-700 hover:bg-zinc-700 hover:text-white'}`}>
            <div className="w-12 h-12 shrink-0 flex items-center justify-center font-bold">
                {icon}
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

    // Don't show sidebar on auth or onboarding pages
    if (pathname === "/auth" || pathname === "/onboarding" || pathname === "/") return null;
    if (loading || !user) return null;

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
                    icon={<NotebookPen className="w-5 h-5" />}
                    label="Forums"
                    isActive={pathname === "/forum"}
                />
                <NavButton
                    href="/quizzes"
                    icon={
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                            <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                    }
                    label="Quizzes"
                    isActive={pathname === "/quizzes"}
                />
                <NavButton
                    href="/feed"
                    icon={<Zap className="w-5 h-5 fill-current" />}
                    label="Blips"
                    isActive={pathname === "/feed"}
                />
            </div>
        </div>
    );
}
