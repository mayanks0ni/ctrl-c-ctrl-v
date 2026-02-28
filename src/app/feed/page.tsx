"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import FeedScroller from "@/components/feed/FeedScroller";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useSearchParams } from "next/navigation";

interface SelectedSubject {
    name: string;
    difficulty: "intermediate" | "beginner" | "advanced";
}

export default function FeedPage() {
    const { user, loading } = useRequireAuth();
    const searchParams = useSearchParams();
    const [subjects, setSubjects] = useState<SelectedSubject[]>([]);

    const activeSubjectName = searchParams.get("subject");

    useEffect(() => {
        if (user) {
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
            });
        }
    }, [user]);

    const activeSubject = subjects.find(s => s.name === activeSubjectName);

    if (loading || !user) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="h-[100dvh] w-full bg-black relative overflow-hidden">
            <FeedScroller
                userId={user.uid}
                subject={activeSubject?.name}
                difficulty={activeSubject?.difficulty}
            />
        </div>
    );
}
