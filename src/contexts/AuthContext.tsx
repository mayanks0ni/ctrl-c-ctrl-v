"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/config";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import TimetableMonitor from "@/components/timetable/TimetableMonitor";

interface AuthContextType {
    user: User | null;
    userData: any | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    userData: null,
    loading: true,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                try {
                    // Check if user document exists in Firestore
                    const userRef = doc(db, "users", firebaseUser.uid);
                    const userSnap = await getDoc(userRef);

                    if (!userSnap.exists()) {
                        // Create new user profile document
                        await setDoc(userRef, {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName || 'Learner',
                            createdAt: serverTimestamp(),
                            xp: 0,
                            streak: 0,
                            subjects: []
                        });
                        setUserData({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName || 'Learner', xp: 0, streak: 0, subjects: [] });
                    } else {
                        setUserData(userSnap.data());
                    }
                } catch (error) {
                    console.error("Error creating user profile in Firestore:", error);
                    // We don't throw here to ensure setUser is still called
                    // and the user can at least access the app even if profile creation fails (e.g., due to strict rules)
                }
            } else {
                setUserData(null);
            }
            setUser(firebaseUser);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, userData, loading }}>
            {children}
            {user && <TimetableMonitor userId={user.uid} />}
        </AuthContext.Provider>
    );
};
